"""ChromaDB service for vector operations using LangChain Chroma vectorstore."""

import logging
import os
from typing import List, Dict, Any, Optional, Tuple

# Disable ChromaDB telemetry to prevent warnings
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
        """Initialize ChromaDB client and LangChain vectorstore."""
        try:
            logger.info(f"Attempting connection to ChromaDB server at {settings.CHROMA_HOST}:{settings.CHROMA_PORT}")
            self.client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self.client.heartbeat()
            logger.info("Successfully connected to ChromaDB HTTP server.")
        except Exception as e:
            logger.warning(f"Could not connect to ChromaDB HTTP server ({e}). Falling back to local PersistentClient ('./chroma_data').")
            try:
                self.client = chromadb.PersistentClient(path="./chroma_data")
                logger.info("Successfully initialized local ChromaDB PersistentClient.")
            except Exception as ex:
                logger.error(f"Failed to initialize local ChromaDB PersistentClient: {str(ex)}")
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
            logger.info(f"Successfully loaded LangChain Chroma vectorstore for '{self.collection_name}'.")
        except Exception as e:
            logger.error(f"Failed to initialize LangChain Chroma vectorstore: {str(e)}")
            self.vectorstore = None

    @property
    def collection(self):
        """Access the underlying chromadb collection if needed."""
        if self.vectorstore and hasattr(self.vectorstore, "_collection"):
            return self.vectorstore._collection
        return None

    def add_documents(self, documents: List[Document], ids: Optional[List[str]] = None) -> bool:
        """Add LangChain Document objects to vectorstore."""
        if not self.vectorstore:
            self._initialize_client()
        if not self.vectorstore:
            logger.error("Chroma vectorstore not initialized.")
            return False

        try:
            # ChromaDB rejects empty lists in metadata (e.g. tags: [])
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
            logger.info(f"Successfully added {len(documents)} documents to Chroma vectorstore.")
            return True
        except Exception as e:
            logger.error(f"Error adding documents to Chroma: {str(e)}")
            return False

    def similarity_search(
        self,
        query: str,
        k: int = 5,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Document]:
        """LangChain similarity search."""
        if not self.vectorstore:
            self._initialize_client()
        if not self.vectorstore:
            logger.error("Chroma vectorstore not initialized.")
            return []

        try:
            return self.vectorstore.similarity_search(query=query, k=k, filter=filter)
        except Exception as e:
            logger.error(f"Error in similarity_search: {str(e)}")
            return []

    def similarity_search_with_relevance_scores(
        self,
        query: str,
        k: int = 5,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Tuple[Document, float]]:
        """LangChain similarity search returning (Document, relevance_score) pairs."""
        if not self.vectorstore:
            self._initialize_client()
        if not self.vectorstore:
            logger.error("Chroma vectorstore not initialized.")
            return []

        try:
            return self.vectorstore.similarity_search_with_relevance_scores(query=query, k=k, filter=filter)
        except Exception as e:
            logger.error(f"Error in similarity_search_with_relevance_scores: {str(e)}")
            return []

    def as_retriever(self, k: int = 5, search_filter: Optional[Dict[str, Any]] = None):
        """Returns a LangChain retriever instance."""
        if not self.vectorstore:
            self._initialize_client()
        if not self.vectorstore:
            raise RuntimeError("Chroma vectorstore is not available.")

        search_kwargs = {"k": k}
        if search_filter:
            search_kwargs["filter"] = search_filter
            
        return self.vectorstore.as_retriever(search_kwargs=search_kwargs)

    def delete_document_chunks(self, document_id: str) -> bool:
        """Delete all chunks for a document."""
        if not self.collection:
            logger.error("ChromaDB collection not initialized.")
            return False
            
        try:
            self.collection.delete(
                where={"document_id": document_id}
            )
            logger.info(f"Successfully deleted chunks for document {document_id}")
            return True
        except Exception as e:
            logger.error(f"Error deleting chunks for document {document_id}: {str(e)}")
            return False

    def get_collection_stats(self) -> Dict[str, Any]:
        """Return count and metadata about the collection."""
        if not self.collection:
            return {"count": 0, "status": "uninitialized"}
            
        try:
            count = self.collection.count()
            metadata = self.collection.metadata
            return {
                "count": count,
                "metadata": metadata,
                "status": "connected"
            }
        except Exception as e:
            logger.error(f"Error getting collection stats: {str(e)}")
            return {"count": 0, "status": "error", "error": str(e)}

# Singleton instance
chroma_service = ChromaService()

