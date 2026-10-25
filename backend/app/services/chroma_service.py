"""ChromaDB service for vector operations using LangChain Chroma vectorstore.

Includes Hybrid Search combining Dense vector cosine similarity and BM25 sparse keyword matching.
RAG FIX: Uses absolute path for PersistentClient fallback to prevent
path resolution issues when uvicorn is started from different directories."""

import logging
import os
import re
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

try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

from app.config import settings
from app.services.embedding_service import embedding_service

logger = logging.getLogger(__name__)

class ChromaService:
    def __init__(self):
        self.client = None
        self.collection_name = 'ekms_documents'
        self.vectorstore: Optional[Chroma] = None
        self._bm25_index: Optional[Any] = None
        self._bm25_docs: List[Document] = []
        self._bm25_dirty: bool = True
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

    def _tokenize(self, text: str) -> List[str]:
        """Simple, fast tokenization for BM25 matching."""
        return re.findall(r'\w+', text.lower())

    def _ensure_bm25_index(self):
        """Build or refresh in-memory BM25 index from Chroma collection."""
        if not self._bm25_dirty and self._bm25_index is not None:
            return

        if BM25Okapi is None:
            logger.warning("rank_bm25 is not installed. Hybrid search will fall back to dense search.")
            return

        self._ensure_initialized()
        if not self.collection:
            return

        try:
            raw = self.collection.get(include=['metadatas', 'documents'])
            docs = []
            corpus_tokens = []
            documents = raw.get('documents', []) or []
            metadatas = raw.get('metadatas', []) or []

            for i in range(len(documents)):
                meta = metadatas[i] if i < len(metadatas) else {}
                doc = Document(page_content=documents[i], metadata=meta)
                docs.append(doc)
                corpus_tokens.append(self._tokenize(documents[i]))

            if corpus_tokens:
                self._bm25_index = BM25Okapi(corpus_tokens)
                self._bm25_docs = docs
                self._bm25_dirty = False
                logger.info(f"BM25 index initialized with {len(docs)} document chunks.")
            else:
                self._bm25_index = None
                self._bm25_docs = []
                self._bm25_dirty = False
        except Exception as e:
            logger.error(f"Error building BM25 index: {e}", exc_info=True)

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
            self._bm25_dirty = True
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

    def similarity_search_hybrid_with_relevance_scores(
        self,
        query: str,
        k: int = 5,
        filter: Optional[Dict[str, Any]] = None,
        alpha: float = 0.65
    ) -> List[Tuple[Document, float]]:
        """Hybrid search combining Dense vector cosine similarity and Sparse BM25 keyword matching.

        Args:
            query: The user query string.
            k: Top-K candidates to retrieve.
            filter: Optional ChromaDB metadata filter.
            alpha: Weight for dense vector search (0.0 to 1.0). (1.0 - alpha) is BM25 weight.

        Returns:
            List of (Document, score) tuples sorted by hybrid score descending.
        """
        # 1. Dense vector search (retrieves more candidates for fusion)
        dense_candidates = max(k * 2, 25)
        dense_results = self.similarity_search_with_relevance_scores(query=query, k=dense_candidates, filter=filter)

        # 2. Sparse BM25 keyword search
        try:
            self._ensure_bm25_index()
        except Exception as e:
            logger.warning(f"Could not build BM25 index: {e}")

        if not self._bm25_index or not self._bm25_docs:
            return dense_results[:k]

        q_tokens = self._tokenize(query)
        if not q_tokens:
            return dense_results[:k]

        try:
            bm25_scores = self._bm25_index.get_scores(q_tokens)
            max_bm25 = max(bm25_scores) if len(bm25_scores) > 0 and max(bm25_scores) > 0 else 1.0

            dense_map: Dict[str, Tuple[Document, float]] = {}
            for d, s in dense_results:
                doc_id = d.metadata.get("document_id", "doc")
                chunk_idx = d.metadata.get("chunk_index", 0)
                dense_map[f"{doc_id}_{chunk_idx}"] = (d, s)

            combined: Dict[str, Tuple[Document, float]] = {}
            for i, d in enumerate(self._bm25_docs):
                doc_id = d.metadata.get("document_id", "doc")
                chunk_idx = d.metadata.get("chunk_index", 0)
                key = f"{doc_id}_{chunk_idx}"

                norm_bm25 = bm25_scores[i] / max_bm25 if max_bm25 > 0 else 0.0

                if key in dense_map:
                    dense_score = dense_map[key][1]
                    doc_obj = dense_map[key][0]
                else:
                    dense_score = 0.30
                    doc_obj = d

                # Include if returned by dense search or has meaningful keyword match
                if key in dense_map or norm_bm25 > 0.15:
                    comb_score = alpha * dense_score + (1.0 - alpha) * norm_bm25
                    combined[key] = (doc_obj, round(comb_score, 4))

            sorted_candidates = sorted(combined.values(), key=lambda x: x[1], reverse=True)
            return sorted_candidates[:k]
        except Exception as e:
            logger.error(f"Error during hybrid fusion: {e}", exc_info=True)
            return dense_results[:k]

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
            self._bm25_dirty = True
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
