import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

_ENV_FILE_PATH = Path(__file__).resolve().parent.parent / ".env"
# Absolute path to project root for ChromaDB fallback
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    SUPABASE_JWT_SECRET: str
    
    # Gemini
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    
    # ChromaDB
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    CHROMA_DATA_PATH: str = str(PROJECT_ROOT / "chroma_data")
    
    # RAG Configuration
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RESULTS: int = 8
    DEFAULT_TEMPERATURE: float = 0.3
    DEFAULT_MAX_TOKENS: int = 4096
    
    # App
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:3000"
    MAX_UPLOAD_SIZE_MB: int = 50
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    model_config = SettingsConfigDict(
        env_file=(_ENV_FILE_PATH if _ENV_FILE_PATH.exists() else ".env", "backend/.env", ".env"),
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()
