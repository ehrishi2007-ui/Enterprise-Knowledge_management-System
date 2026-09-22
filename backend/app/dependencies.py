import functools
from supabase import create_client, Client
import chromadb
from chromadb.api import ClientAPI
from sentence_transformers import SentenceTransformer
from app.config import settings

@functools.lru_cache()
def get_supabase_client() -> Client:
    """Returns a Supabase client using the service role key for admin operations."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

@functools.lru_cache()
def get_supabase_anon_client() -> Client:
    """Returns a Supabase client using the anon key for user-scoped operations."""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

def get_chroma_client():
    """Returns the ChromaDB client from chroma_service (supports HTTP & local fallback)."""
    from app.services.chroma_service import chroma_service
    return chroma_service.client

def get_chroma_collection():
    """Returns the 'ekms_documents' collection from chroma_service."""
    from app.services.chroma_service import chroma_service
    return chroma_service.collection

def get_embedding_model():
    """Returns the LangChain HuggingFaceEmbeddings model singleton."""
    from app.services.embedding_service import embedding_service
    return embedding_service.embeddings

