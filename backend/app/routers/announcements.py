import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.middleware.auth import get_current_user, require_admin
from app.dependencies import get_supabase_client
from app.models.schemas import (
    AnnouncementCreate, AnnouncementResponse, AdminDashboardStats,
    MessageResponse, FeedbackResponse, FeedbackSummary
)

router = APIRouter(tags=["Announcements"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[AnnouncementResponse])
@router.get("/", response_model=List[AnnouncementResponse])
async def list_announcements(
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """List all announcements."""
    try:
        resp = supabase.table("announcements").select("*").order("created_at", desc=True).execute()
        return [AnnouncementResponse(**a) for a in resp.data]
    except Exception as e:
        logger.error(f"Error fetching announcements: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return []
        raise HTTPException(status_code=500, detail="Failed to fetch announcements")

@router.post("", response_model=AnnouncementResponse)
@router.post("/", response_model=AnnouncementResponse)
async def create_announcement(
    announcement: AnnouncementCreate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Create an announcement."""
    try:
        data = {
            "title": announcement.title,
            "content": announcement.content,
            "created_by": str(current_user["id"])
        }
        resp = supabase.table("announcements").insert(data).execute()
        return AnnouncementResponse(**resp.data[0])
    except Exception as e:
        logger.error(f"Error creating announcement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create announcement")

@router.delete("/{announcement_id}", response_model=MessageResponse)
async def delete_announcement(
    announcement_id: str,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Delete an announcement."""
    try:
        resp = supabase.table("announcements").delete().eq("id", announcement_id).execute()
        return MessageResponse(message="Announcement deleted successfully", success=True)
    except Exception as e:
        logger.error(f"Error deleting announcement: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete announcement")

@router.get("/admin/dashboard", response_model=AdminDashboardStats)
async def get_admin_dashboard(
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Get admin dashboard statistics."""
    try:
        # Get total users
        users_resp = supabase.table("profiles").select("id", count="exact").execute()
        total_users = users_resp.count if hasattr(users_resp, "count") and users_resp.count is not None else len(users_resp.data)
        
        # Get total documents
        docs_resp = supabase.table("documents").select("id, title", count="exact").execute()
        total_docs = docs_resp.count if hasattr(docs_resp, "count") and docs_resp.count is not None else len(docs_resp.data)
        
        # Get total queries
        msgs_resp = supabase.table("chat_messages").select("id", count="exact").eq("role", "user").execute()
        total_queries = msgs_resp.count if hasattr(msgs_resp, "count") and msgs_resp.count is not None else len(msgs_resp.data)
        
        # Calculate real average response time from assistant chat messages
        avg_resp = supabase.table("chat_messages").select("response_time_ms").eq("role", "assistant").execute()
        times = [m["response_time_ms"] for m in (avg_resp.data or []) if m.get("response_time_ms") is not None]
        avg_response_time = round(sum(times) / len(times), 1) if times else 0.0
        
        # Feedback summary
        feedback_resp = supabase.table("feedback").select("*").execute()
        all_fb = feedback_resp.data or []
        total_fb = len(all_fb)
        helpful = sum(1 for f in all_fb if f.get("rating") == "helpful")
        not_helpful = total_fb - helpful
        helpful_pct = round((helpful / total_fb * 100), 1) if total_fb > 0 else 0.0

        fb_summary = FeedbackSummary(
            total_feedback=total_fb,
            helpful_count=helpful,
            not_helpful_count=not_helpful,
            helpful_percentage=helpful_pct,
            recent_feedback=[]
        )
        
        # Top 5 documents
        top_docs = []
        if docs_resp.data:
            top_docs = [{"title": d["title"], "views": 0} for d in docs_resp.data[:5]]
            
        # Top 5 questions
        top_questions = []
        q_resp = supabase.table("chat_messages").select("content").eq("role", "user").order("created_at", desc=True).limit(5).execute()
        if q_resp.data:
            top_questions = [{"question": q["content"]} for q in q_resp.data]
            
        return AdminDashboardStats(
            total_users=total_users,
            total_documents=total_docs,
            total_queries=total_queries,
            avg_response_time_ms=avg_response_time,
            feedback_summary=fb_summary,
            top_documents=top_docs,
            top_questions=top_questions
        )
    except Exception as e:
        logger.error(f"Error fetching admin dashboard: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return AdminDashboardStats(
                total_users=2,
                total_documents=0,
                total_queries=0,
                avg_response_time_ms=0.0,
                feedback_summary=FeedbackSummary(
                    total_feedback=0,
                    helpful_count=0,
                    not_helpful_count=0,
                    helpful_percentage=0.0,
                    recent_feedback=[]
                ),
                top_documents=[],
                top_questions=[]
            )
        raise HTTPException(status_code=500, detail="Failed to fetch dashboard stats")
