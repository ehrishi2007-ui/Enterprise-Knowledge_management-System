"""The core RAG pipeline using LangChain and Google Gemini."""

import re
import time
import logging
from typing import List, Dict, Any, Optional

from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.services.chroma_service import chroma_service

logger = logging.getLogger(__name__)

DEFAULT_SYSTEM_PROMPT = """You are a helpful, professional enterprise knowledge assistant.
Use ONLY the provided context documents to answer the user's question accurately.
If the context does not contain sufficient information to answer, say "I don't have enough information to answer that based on the provided documents."
Do not extrapolate or use outside knowledge.
Always cite your sources using the format [Document Name, Page X] when referencing facts.
Keep your answers clear, concise, structured, and professional. Avoid unnecessary wordiness."""

class RAGPipeline:
    def __init__(self):
        self._cached_ai_settings: Optional[Dict[str, Any]] = None
        self._settings_cache_time: float = 0.0
        self._settings_ttl: float = 300.0  # Cache settings for 5 minutes to avoid DB round-trips
        self._query_cache: Dict[str, Dict[str, Any]] = {}
        self._max_cache_size: int = 200

    def get_ai_settings(self, supabase_client, force_refresh: bool = False) -> Dict[str, Any]:
        """Fetch AI settings with in-memory caching to eliminate per-request DB round-trips."""
        now = time.time()
        if not force_refresh and self._cached_ai_settings and (now - self._settings_cache_time < self._settings_ttl):
            return dict(self._cached_ai_settings)

        ai_settings = {
            "system_prompt": DEFAULT_SYSTEM_PROMPT,
            "temperature": settings.DEFAULT_TEMPERATURE,
            "max_tokens": 1024,
            "top_k": settings.TOP_K_RESULTS,
            "model_name": settings.GEMINI_MODEL
        }
        try:
            response = supabase_client.table('settings').select('*').execute()
            if response.data:
                settings_map = {item['key']: item['value'] for item in response.data}
                if "system_prompt" in settings_map and settings_map["system_prompt"]:
                    ai_settings["system_prompt"] = settings_map["system_prompt"]
                if "temperature" in settings_map and settings_map["temperature"]:
                    ai_settings["temperature"] = float(settings_map["temperature"])
                if "max_tokens" in settings_map and settings_map["max_tokens"]:
                    ai_settings["max_tokens"] = min(int(settings_map["max_tokens"]), 2048)
                if "top_k" in settings_map and settings_map["top_k"]:
                    ai_settings["top_k"] = int(settings_map["top_k"])
                if "model_name" in settings_map and settings_map["model_name"]:
                    ai_settings["model_name"] = settings_map["model_name"]

            self._cached_ai_settings = dict(ai_settings)
            self._settings_cache_time = now
        except Exception as e:
            logger.warning(f"Could not fetch AI settings from database, using defaults: {e}")

        return ai_settings

    def format_context(self, docs) -> str:
        """Format retrieved LangChain Document objects into a prompt context string."""
        if not docs:
            return "No relevant documents found."
        
        context_blocks = []
        for i, doc in enumerate(docs):
            doc_title = doc.metadata.get("title", doc.metadata.get("document_name", "Document"))
            page_num = doc.metadata.get("page", doc.metadata.get("page_number", 1))
            context_blocks.append(f"--- SOURCE {i+1}: {doc_title} (Page {page_num}) ---\n{doc.page_content}")
        return "\n\n".join(context_blocks)

    def ask(
        self,
        question: str,
        conversation_history: List[Dict[str, str]],
        user_department: str,
        supabase_client,
        user_role: str = "employee"
    ) -> Dict[str, Any]:
        """Execute the LangChain RAG pipeline with latency caching."""
        start_time = time.time()
        cache_key = f"{user_role}:{user_department}:{question.strip().lower()}"
        if not conversation_history and cache_key in self._query_cache:
            cached_result = dict(self._query_cache[cache_key])
            cached_result["response_time_ms"] = int((time.time() - start_time) * 1000)
            cached_result["is_cached"] = True
            logger.info(f"Cache HIT for query: '{question}' in {cached_result['response_time_ms']}ms")
            return cached_result

        try:
            # 1. Fetch AI & RAG settings
            ai_settings = self.get_ai_settings(supabase_client)
            
            # 2. Retrieve relevant candidates using LangChain Chroma (with scores for metrics)
            # Retrieve enough candidates to apply accurate permission filtering & deduplication
            target_top_k = int(ai_settings.get("top_k", 5))
            candidate_k = max(target_top_k * 5, 25)
            logger.info(f"Retrieving top {candidate_k} candidates for user_role '{user_role}', user_dept '{user_department}' with model {ai_settings['model_name']} for question: '{question}'")
            # Use hybrid scored search (Dense + BM25) so similarity scores are available for IR metrics
            candidate_docs_with_scores = chroma_service.similarity_search_hybrid_with_relevance_scores(
                query=question,
                k=candidate_k,
                alpha=0.65
            )
            
            # 3. Apply RBAC (Department + Role) filtering in Python & cross-document deduplication
            retrieved_docs = []
            retrieved_docs_with_scores = []   # Post-RBAC docs with their scores (for metrics)
            seen_signatures = set()
            for doc, score in candidate_docs_with_scores:
                meta = doc.metadata or {}
                doc_dept = meta.get("department", "All")
                allowed_depts = meta.get("allowed_departments", "All")
                allowed_roles = meta.get("allowed_roles", "All")
                is_pub = meta.get("is_public", True)

                # Check Role Permission
                allowed_roles_list = [r.strip() for r in allowed_roles.split(",")] if isinstance(allowed_roles, str) else (allowed_roles or [])
                is_role_permitted = (
                    user_role == "admin" or
                    "All" in allowed_roles_list or
                    user_role in allowed_roles_list or
                    not allowed_roles_list
                )
                if not is_role_permitted:
                    continue
                
                # Check Department Permission
                if not user_department or user_department == "All" or user_role == "admin":
                    is_dept_permitted = True
                else:
                    allowed_list = [d.strip() for d in allowed_depts.split(",")] if isinstance(allowed_depts, str) else (allowed_depts or [])
                    is_dept_permitted = (
                        is_pub or
                        doc_dept in ["All", "General", user_department] or
                        "All" in allowed_list or
                        user_department in allowed_list
                    )
                
                if not is_dept_permitted:
                    continue

                # Relevance score threshold: reject trailing low-relevance noise chunks (score < 0.48)
                if score < 0.48 and len(retrieved_docs) >= 1:
                    continue

                # Cross-document deduplication (prevents duplicate documents from monopolizing top-k)
                cleaned = re.sub(r'\[.*?\]\(.*?\)|!\[.*?\]\(.*?\)|[^a-zA-Z0-9]', '', doc.page_content.lower())
                signature = cleaned[:80]
                if signature and signature in seen_signatures:
                    continue
                if signature:
                    seen_signatures.add(signature)

                retrieved_docs.append(doc)
                retrieved_docs_with_scores.append((doc, score))   # Track score alongside doc
                        
                if len(retrieved_docs) >= target_top_k:
                    break
            
            # 4. Extract structured sources for the frontend
            sources = []
            seen_sources = set()
            for doc in retrieved_docs:
                doc_title = doc.metadata.get("title", doc.metadata.get("document_name", "Document"))
                page_num = doc.metadata.get("page", doc.metadata.get("page_number", 1))
                doc_id = doc.metadata.get("document_id")
                
                dedup_key = f"{doc_title}_{page_num}_{doc.page_content[:40]}"
                if dedup_key not in seen_sources:
                    seen_sources.add(dedup_key)
                    sources.append({
                        "title": doc_title,
                        "document_title": doc_title,
                        "document_id": str(doc_id) if doc_id else None,
                        "page": page_num,
                        "page_number": page_num,
                        "snippet": doc.page_content,
                        "chunk_text": doc.page_content
                    })

            # 5. Format formatted context & conversation history
            formatted_context = self.format_context(retrieved_docs)
            
            history_messages = []
            if conversation_history:
                for msg in conversation_history[-6:]:
                    if msg.get("role") == "user":
                        history_messages.append(HumanMessage(content=msg.get("content", "")))
                    elif msg.get("role") == "assistant":
                        history_messages.append(AIMessage(content=msg.get("content", "")))

            # 6. Compose LangChain Prompt Template
            prompt_template = ChatPromptTemplate.from_messages([
                SystemMessage(content=ai_settings["system_prompt"]),
                ("system", "--- RETRIEVED CONTEXT ---\n{context}\n--- END CONTEXT ---"),
                MessagesPlaceholder("chat_history"),
                ("human", "{question}")
            ])

            # 7. Model fallback list with rapid failover (max_retries=1, timeout=10s)
            primary_model = ai_settings.get("model_name") or settings.GEMINI_MODEL
            # Prioritize stable GA models (gemini-flash-lite-latest) to eliminate 10s timeout stalls on degraded preview endpoints
            if primary_model in ["gemini-3.1-flash-lite", "gemini-3.5-flash"]:
                candidate_models = ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", primary_model, "gemini-3.8-flash"]
            else:
                candidate_models = [primary_model]
                for fb in ["gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-3.8-flash"]:
                    if fb not in candidate_models:
                        candidate_models.append(fb)

            response = None
            last_err = None

            for model_to_use in candidate_models:
                try:
                    logger.info(f"Invoking Gemini model: {model_to_use}")
                    llm = ChatGoogleGenerativeAI(
                        model=model_to_use,
                        google_api_key=settings.GEMINI_API_KEY,
                        temperature=ai_settings["temperature"],
                        max_tokens=ai_settings["max_tokens"],
                        max_retries=1,
                        timeout=10.0
                    )
                    chain = prompt_template | llm
                    response = chain.invoke({
                        "context": formatted_context,
                        "chat_history": history_messages,
                        "question": question
                    })
                    if response and response.content:
                        break
                except Exception as model_err:
                    logger.warning(f"Model {model_to_use} failed ({model_err}). Trying fallback model...")
                    last_err = model_err

            if not response or not response.content:
                raise last_err or RuntimeError("All Gemini models failed to generate response")
            
            raw_content = response.content
            if isinstance(raw_content, str):
                answer_text = raw_content
            elif isinstance(raw_content, dict):
                answer_text = raw_content.get("text", str(raw_content))
            elif isinstance(raw_content, list):
                parts = []
                for part in raw_content:
                    if isinstance(part, dict) and "text" in part:
                        parts.append(part["text"])
                    elif isinstance(part, str):
                        parts.append(part)
                    else:
                        parts.append(str(part))
                answer_text = "\n".join(parts)
            else:
                answer_text = str(raw_content)
                
            response_time_ms = int((time.time() - start_time) * 1000)
            logger.info(f"LangChain RAG pipeline finished in {response_time_ms}ms with {len(sources)} sources.")

            result_payload = {
                "answer": answer_text,
                "sources": sources,
                "response_time_ms": response_time_ms,
                "_metrics_data": {
                    "candidate_docs_with_scores": candidate_docs_with_scores,
                    "retrieved_docs_with_scores": retrieved_docs_with_scores,
                },
            }

            if not conversation_history:
                if len(self._query_cache) >= self._max_cache_size:
                    self._query_cache.pop(next(iter(self._query_cache)))
                self._query_cache[cache_key] = result_payload

            return result_payload
            
        except Exception as e:
            logger.error(f"Error in LangChain RAG pipeline: {e}", exc_info=True)
            response_time_ms = int((time.time() - start_time) * 1000)
            return {
                "answer": "An error occurred while trying to process your request. Please try again later.",
                "sources": [],
                "error": str(e),
                "response_time_ms": response_time_ms
            }

# Singleton instance
rag_pipeline = RAGPipeline()

