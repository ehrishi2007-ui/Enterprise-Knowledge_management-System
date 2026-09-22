"""ChromaDB service for vector operations using LangChain Chroma vectorstore.

RAG FIX: Uses absolute path for PersistentClient fallback to prevent
path resolution issues when uvicorn is started from different directories."""

import logging
import os
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

os.environ["ANONYMIZED_TELEMETRY"] = "False"

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_core.documents import Document
try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

from app.config import settings
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

class ChromaService:
    def __init__(self):
        self.client = None
        self.collection_name = 'ekms_documents'
        self.vectorstore: Optional[Chroma] = None
        self._initialize_client()
        
    def _initialize_client(self):
        """Initialize ChromaDB client and LangChain vectorstore.
        
        Tries HTTP client first (for Docker), falls back to PersistentClient
        using an ABSOLUTE path to prevent path resolution bugs.
        """
        try:
            logger.info(f"Attempting ChromaDB HTTP connection at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self.client.heartbeat()
            logger.info("Connected to ChromaDB HTTP server.")
        except Exception as e:
            logger.warning(f"ChromaDB HTTP connection failed ({e}). Using local PersistentClient.")
            try:
                # KEY FIX: Use absolute path from config instead of relative './chroma_data'
                chroma_path = settings.CHROMA_DATA_PATH
                os.makedirs(chroma_path, exist_ok=True)
                logger.info(f"Initializing ChromaDB PersistentClient at: {chroma_path}")
                self.client = chromadb.PersistentClient(path=chroma_path)
                logger.info("ChromaDB PersistentClient initialized.")
            except Exception as ex:
                logger.error(f"Failed to initialize ChromaDB PersistentClient: {ex}")
                self.client = None
                self.vectorstore = None
                return

        try:
            self.vectorstore = Chroma(
                client=self.client,
                collection_name=self.collection_name,
                embedding_function=embedding_service.embeddings,
                collection_metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Chroma vectorstore '{self.collection_name}' ready.")
        except Exception as e:
            logger.error(f"Failed to initialize Chroma vectorstore: {e}")
            self.vectorstore = None

    def _ensure_initialized(self):
        """Re-initialize if vectorstore is not available."""
        if not self.vectorstore:
            logger.info("Vectorstore not available, attempting re-initialization...")
            self._initialize_client()

    @property
    def collection(self):
        if self.vectorstore and hasattr(self.vectorstore, "_collection"):
            return self.vectorstore._collection
        return None

    def add_documents(self, documents: List[Document], ids: Optional[List[str]] = None) -> bool:
        self._ensure_initialized()
        if not self.vectorstore:
            logger.error("Chroma vectorstore not initialized.")
            return False
        try:
            for doc in documents:
                if doc.metadata:
                    doc.metadata = {
                        k: v for k, v in doc.metadata.items()
                        if not (isinstance(v, list) and len(v) == 0)
                    }
            if not ids:
                ids = [
                    f"{doc.metadata.get('document_id', 'doc')}_chunk_{doc.metadata.get('chunk_index', i)}"
                    for i, doc in enumerate(documents)
                ]
            self.vectorstore.add_documents(documents=documents, ids=ids)
            logger.info(f"Added {len(documents)} documents to Chroma.")
            return True
        except Exception as e:
            logger.error(f"Error adding documents to Chroma: {e}")
            return False

    def similarity_search(self, query: str, k: int = 5, filter: Optional[Dict[str, Any]] = None) -> List[Document]:
        self._ensure_initialized()
        if not self.vectorstore:
            return []
        try:
            return self.vectorstore.similarity_search(query=query, k=k, filter=filter)
        except Exception as e:
            logger.error(f"Error in similarity_search: {e}")
            return []

    def similarity_search_with_relevance_scores(self, query: str, k: int = 5, filter: Optional[Dict[str, Any]] = None) -> List[Tuple[Document, float]]:
        self._ensure_initialized()
        if not self.vectorstore:
            return []
        try:
            return self.vectorstore.similarity_search_with_relevance_scores(query=query, k=k, filter=filter)
        except Exception as e:
            logger.error(f"Error in similarity_search_with_scores: {e}")
            return []

    def as_retriever(self, k: int = 5, search_filter: Optional[Dict[str, Any]] = None):
        self._ensure_initialized()
        if not self.vectorstore:
            raise RuntimeError("Chroma vectorstore is not available.")
        search_kwargs = {"k": k}
        if search_filter:
            search_kwargs["filter"] = search_filter
        return self.vectorstore.as_retriever(search_kwargs=search_kwargs)

    def delete_document_chunks(self, document_id: str) -> bool:
        if not self.collection:
            return False
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted chunks for document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting chunks for {document_id}: {e}")
            return False

    def get_collection_stats(self) -> Dict[str, Any]:
        if not self.collection:
            return {"count": 0, "status": "uninitialized"}
        try:
            return {"count": self.collection.count(), "metadata": self.collection.metadata, "status": "connected"}
        except Exception as e:
            return {"count": 0, "status": "error", "error": str(e)}

chroma_service = ChromaService()
