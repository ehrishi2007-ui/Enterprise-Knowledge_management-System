"""Embedding service using LangChain HuggingFaceEmbeddings (all-MiniLM-L6-v2)."""

from typing import List, Optional
import logging

try:
    from langchain_huggingface import HuggingFaceEmbeddings
except ImportError:
    from langchain_community.embeddings import HuggingFaceEmbeddings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model_name = "all-MiniLM-L6-v2"
        self.dimension = 384
        self._embeddings: Optional[HuggingFaceEmbeddings] = None
    
    @property
    def embeddings(self) -> HuggingFaceEmbeddings:
        if self._embeddings is None:
            logger.info(f"Initializing HuggingFaceEmbeddings with {self.model_name}...")
            try:
                # Fast path: use local files to prevent offline timeouts / retries
                self._embeddings = HuggingFaceEmbeddings(
                    model_name=self.model_name,
                    encode_kwargs={"normalize_embeddings": True},
                    model_kwargs={"local_files_only": True}
                )
                logger.info("HuggingFaceEmbeddings initialized successfully (local cache).")
            except Exception:
                try:
                    self._embeddings = HuggingFaceEmbeddings(
                        model_name=self.model_name,
                        encode_kwargs={"normalize_embeddings": True}
                    )
                    logger.info("HuggingFaceEmbeddings initialized successfully.")
                except Exception as e:
                    logger.error(f"Failed to initialize embeddings: {e}")
                    raise
        return self._embeddings

    def load_model(self):
        _ = self.embeddings

    def embed_text(self, text: str) -> List[float]:
        return self.embeddings.embed_query(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        return self.embeddings.embed_documents(texts)

embedding_service = EmbeddingService()
