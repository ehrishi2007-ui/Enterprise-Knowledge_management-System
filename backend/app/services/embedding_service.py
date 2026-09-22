"""Embedding service using LangChain HuggingFaceEmbeddings (all-MiniLM-L6-v2).
Generates 384-dimensional embeddings for text chunks and queries."""

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
        """Returns the LangChain HuggingFaceEmbeddings instance (singleton)."""
        if self._embeddings is None:
            logger.info(f"Initializing LangChain HuggingFaceEmbeddings with {self.model_name}...")
            self._embeddings = HuggingFaceEmbeddings(
                model_name=self.model_name,
                encode_kwargs={"normalize_embeddings": True}
            )
            logger.info("LangChain HuggingFaceEmbeddings initialized successfully.")
        return self._embeddings

    def load_model(self):
        """Warm-up model loading."""
        _ = self.embeddings

    def embed_text(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        return self.embeddings.embed_query(text)

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        return self.embeddings.embed_documents(texts)

# Singleton instance
embedding_service = EmbeddingService()

