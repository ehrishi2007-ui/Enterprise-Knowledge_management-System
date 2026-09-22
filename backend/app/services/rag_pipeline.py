"""The core RAG pipeline using LangChain and Google Gemini."""

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
            "max_tokens": settings.DEFAULT_MAX_TOKENS,
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
                    ai_settings["max_tokens"] = int(settings_map["max_tokens"])
                if "top_k" in settings_map and settings_map["top_k"]:
                    ai_settings["top_k"] = int(settings_map["top_k"])
                if "model_name" in settings_map and settings_map["model_name"]:
                    ai_settings["model_name"] = settings_map["model_name"]
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
        supabase_client
    ) -> Dict[str, Any]:
        """Execute the LangChain RAG pipeline."""
        start_time = time.time()
        
        try:
            # 1. Fetch AI & RAG settings
            ai_settings = self.get_ai_settings(supabase_client)
            
            # 2. Build RBAC metadata filter for Chroma
            where_filter = None
            if user_department and user_department != "All":
                where_filter = {
                    "$or": [
                        {"department": user_department},
                        {"department": "All"}
                    ]
                }
            
            # 3. Retrieve relevant documents using LangChain Chroma
            logger.info(f"Retrieving top {ai_settings['top_k']} docs with model {ai_settings['model_name']} for question: '{question}'")
            retrieved_docs = chroma_service.similarity_search(
                query=question,
                k=ai_settings["top_k"],
                filter=where_filter
            )
            
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

            # 7. Initialize LangChain Gemini model (default: gemini-2.5-flash)
            llm = ChatGoogleGenerativeAI(
                model=ai_settings["model_name"],
                google_api_key=settings.GEMINI_API_KEY,
                temperature=ai_settings["temperature"],
                max_tokens=ai_settings["max_tokens"]
            )

            # 8. Run LangChain pipeline
            chain = prompt_template | llm
            response = chain.invoke({
                "context": formatted_context,
                "chat_history": history_messages,
                "question": question
            })
            
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
                "response_time_ms": response_time_ms
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

