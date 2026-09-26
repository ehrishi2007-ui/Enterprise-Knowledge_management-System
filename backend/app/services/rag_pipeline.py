"""The core RAG pipeline using LangChain and Google Gemini."""

import re
import time
import logging
from typing import List, Dict, Any

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
Keep your answers clear, structured, and professional."""

class RAGPipeline:
    def get_ai_settings(self, supabase_client) -> Dict[str, Any]:
        """Fetch AI settings from Supabase settings table or use defaults."""
        ai_settings = {
            "system_prompt": DEFAULT_SYSTEM_PROMPT,
            "temperature": settings.DEFAULT_TEMPERATURE,
            "max_tokens": 4096,
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
                    ai_settings["max_tokens"] = max(int(settings_map["max_tokens"]), 4096)
                if "top_k" in settings_map and settings_map["top_k"]:
                    ai_settings["top_k"] = int(settings_map["top_k"])
                if "model_name" in settings_map and settings_map["model_name"]:
                    ai_settings["model_name"] = settings_map["model_name"]
        except Exception as e:
            logger.warning(f"Could not fetch AI settings from database, using defaults: {e}")
            
        ai_settings["max_tokens"] = max(ai_settings.get("max_tokens", 4096), 4096)
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
        """Execute the LangChain RAG pipeline."""
        start_time = time.time()
        
        try:
            # 1. Fetch AI & RAG settings
            ai_settings = self.get_ai_settings(supabase_client)
            
            # 2. Retrieve relevant candidates using LangChain Chroma (with scores for metrics)
            # Retrieve enough candidates to apply accurate permission filtering & deduplication
            target_top_k = max(ai_settings.get("top_k", 8), 8)
            candidate_k = max(target_top_k * 4, 30)
            logger.info(f"Retrieving top {candidate_k} candidates for user_role '{user_role}', user_dept '{user_department}' with model {ai_settings['model_name']} for question: '{question}'")
            # Use scored search so similarity scores are available for IR metrics
            candidate_docs_with_scores = chroma_service.similarity_search_with_relevance_scores(
                query=question,
                k=candidate_k
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

            # 7. Model fallback list with rapid failover (max_retries=1, timeout=15s)
            primary_model = ai_settings.get("model_name") or settings.GEMINI_MODEL
            candidate_models = [primary_model]
            for fb in ["gemini-3.1-flash-lite", "gemini-flash-lite-latest", "gemini-3.5-flash"]:
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
                        timeout=15.0
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
            
            return {
                "answer": answer_text,
                "sources": sources,
                "response_time_ms": response_time_ms,
                # Internal data consumed by chat.py to fire the background metrics task.
                # Prefixed with _ to signal it is not part of the public API response.
                "_metrics_data": {
                    "candidate_docs_with_scores": candidate_docs_with_scores,
                    "retrieved_docs_with_scores": retrieved_docs_with_scores,
                },
            }
            
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

