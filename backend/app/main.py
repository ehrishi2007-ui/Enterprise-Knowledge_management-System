from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.dependencies import get_embedding_model, get_chroma_client
from app.routers.chat import router as chat_router
from app.routers.documents import router as documents_router
from app.routers.search import router as search_router
from app.routers.users import router as users_router
from app.routers.feedback import router as feedback_router
from app.routers.settings import router as settings_router
from app.routers.announcements import router as announcements_router
from app.routers.departments import router as departments_router
from app.routers.roles import router as roles_router
from app.routers.metrics import router as metrics_router

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup, cleanup on shutdown."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    logger.info("Starting EKMS API...")
    
    try:
        logger.info("Loading embedding model...")
        get_embedding_model()
        logger.info("Embedding model loaded.")
    except Exception as e:
        logger.warning(f"Could not load embedding model at startup: {e}")
    
    try:
        logger.info("Connecting to ChromaDB...")
        get_chroma_client()
        logger.info("ChromaDB connected.")
    except Exception as e:
        logger.warning(f"Could not connect to ChromaDB at startup: {e}")
    
    logger.info("EKMS API started successfully.")
    yield
    logger.info("EKMS API shutting down.")

app = FastAPI(
    title="EKMS API - Knowledge Management System",
    description="Backend API for the Knowledge Management System with RAG-powered AI chat",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    """Health check with ChromaDB connectivity status."""
    chroma_status = "unknown"
    try:
        from app.services.chroma_service import chroma_service
        stats = chroma_service.get_collection_stats()
        chroma_status = stats.get("status", "unknown")
    except Exception:
        chroma_status = "error"
    
    return {
        "status": "healthy",
        "version": "2.0.0",
        "chromadb": chroma_status
    }

app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(documents_router, prefix="/api/documents", tags=["Documents"])
app.include_router(search_router, prefix="/api/search", tags=["Search"])
app.include_router(users_router, prefix="/api/users", tags=["Users"])
app.include_router(feedback_router, prefix="/api/feedback", tags=["Feedback"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(announcements_router, prefix="/api/announcements", tags=["Announcements"])
app.include_router(departments_router, prefix="/api/departments", tags=["Departments"])
app.include_router(roles_router, prefix="/api/roles", tags=["Roles & Permissions"])
app.include_router(metrics_router, prefix="/api/metrics", tags=["Metrics"])
