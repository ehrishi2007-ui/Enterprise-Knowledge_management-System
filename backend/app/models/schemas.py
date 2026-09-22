from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID

# === Auth ===
class UserInfo(BaseModel):
    id: UUID
    email: str
    display_name: str
    role: str
    department: Optional[str] = None
    is_active: bool = True

# === Chat ===
class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="The user's question")
    conversation_id: Optional[UUID] = Field(None, description="Existing conversation ID for follow-up questions")

class SourceCitation(BaseModel):
    document_id: Optional[str] = None
    title: str = "Document"
    document_title: Optional[str] = None
    page: Optional[int] = 1
    page_number: Optional[int] = 1
    snippet: str = ""
    chunk_text: Optional[str] = ""

class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceCitation] = []
    conversation_id: UUID
    message_id: UUID
    response_time_ms: int

class ConversationSummary(BaseModel):
    id: UUID
    title: str
    is_bookmarked: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    message_count: int = 0

class ConversationDetail(BaseModel):
    id: UUID
    title: str
    is_bookmarked: bool = False
    messages: List[dict] = []  # Each has role, content, sources, created_at
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class ConversationRename(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)

# === Documents ===
class DocumentResponse(BaseModel):
    id: UUID
    title: str
    filename: str
    file_type: str
    content_type: str = "text_only"
    file_size_bytes: Optional[int] = None
    department: Optional[str] = None
    tags: List[str] = []
    uploaded_by: Optional[UUID] = None
    allowed_departments: List[str] = ["All"]
    processing_status: str = "pending"
    chunk_count: int = 0
    created_at: Optional[datetime] = None

class DocumentTagsUpdate(BaseModel):
    tags: List[str] = Field(..., description="New list of tags")
    allowed_departments: Optional[List[str]] = None

# === Search ===
class SearchRequest(BaseModel):
    q: str = Field(..., min_length=1, description="Search query")
    search_type: str = Field("semantic", description="'semantic' or 'keyword'")
    department: Optional[str] = None
    tags: Optional[List[str]] = None
    file_type: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(10, ge=1, le=50)

class SearchResult(BaseModel):
    id: Optional[str] = None
    document_id: Optional[str] = None
    title: str = ""
    filename: Optional[str] = None
    department: Optional[str] = None
    tags: List[str] = []
    score: Optional[float] = None
    relevance_score: Optional[float] = None
    snippet: str = ""
    page_number: Optional[int] = None
    created_at: Optional[datetime] = None
    metadata: Optional[dict] = None

class SearchResponse(BaseModel):
    results: List[SearchResult] = []
    total_count: int = 0
    query: str
    search_type: str

# === Users (Admin) ===
class UserCreate(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, description="Initial password")
    display_name: str = Field(..., min_length=1)
    role: str = Field("employee", description="'employee' or 'admin'")
    department: Optional[str] = None

class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

class UserListResponse(BaseModel):
    users: List[UserInfo]
    total_count: int

# === Feedback ===
class FeedbackCreate(BaseModel):
    message_id: UUID
    rating: str = Field(..., description="'helpful' or 'not_helpful'")
    comment: Optional[str] = Field(None, max_length=1000)

class FeedbackResponse(BaseModel):
    id: UUID
    message_id: UUID
    rating: str
    comment: Optional[str] = None
    created_at: datetime

class FeedbackSummary(BaseModel):
    total_feedback: int
    helpful_count: int
    not_helpful_count: int
    helpful_percentage: float
    recent_feedback: List[FeedbackResponse] = []

# === Settings ===
class SettingItem(BaseModel):
    key: str
    value: str
    updated_at: Optional[datetime] = None

class SettingsResponse(BaseModel):
    settings: List[SettingItem]

class SettingsUpdate(BaseModel):
    settings: dict = Field(..., description="Key-value pairs to update, e.g. {'temperature': '0.5'}")

# === Announcements ===
class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    content: Optional[str] = None

class AnnouncementResponse(BaseModel):
    id: UUID
    title: str
    content: Optional[str] = None
    created_by: Optional[UUID] = None
    created_at: datetime

# === Dashboard ===
class AdminDashboardStats(BaseModel):
    total_users: int
    total_documents: int
    total_queries: int
    avg_response_time_ms: Optional[float] = None
    feedback_summary: FeedbackSummary
    top_documents: List[dict] = []
    top_questions: List[dict] = []

class EmployeeDashboard(BaseModel):
    recent_chats: List[ConversationSummary] = []
    recent_documents: List[DocumentResponse] = []
    bookmarked_chats: List[ConversationSummary] = []
    announcements: List[AnnouncementResponse] = []

# === Common ===
class MessageResponse(BaseModel):
    message: str
    success: bool = True
