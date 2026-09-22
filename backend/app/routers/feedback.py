import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import settings
from app.middleware.auth import get_current_user, require_admin
from app.dependencies import get_supabase_client
from app.models.schemas import FeedbackCreate, FeedbackResponse, FeedbackSummary

router = APIRouter(tags=["Feedback"])
logger = logging.getLogger(__name__)

@router.post("", response_model=FeedbackResponse)
@router.post("/", response_model=FeedbackResponse)
async def create_feedback(
    feedback: FeedbackCreate,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Create feedback for a message."""
    try:
        # Verify message belongs to a conversation owned by the user
        msg_resp = supabase.table("chat_messages").select("conversation_id").eq("id", feedback.message_id).execute()
        if not msg_resp.data:
            raise HTTPException(status_code=404, detail="Message not found")
            
        conv_id = msg_resp.data[0]["conversation_id"]
        conv_resp = supabase.table("conversations").select("id").eq("id", conv_id).eq("user_id", current_user["id"]).execute()
        if not conv_resp.data:
            raise HTTPException(status_code=403, detail="Not authorized to leave feedback for this message")
            
        feedback_data = {
            "message_id": feedback.message_id,
            "user_id": current_user["id"],
            "rating": feedback.rating,
            "comment": feedback.comment
        }
        
        resp = supabase.table("feedback").insert(feedback_data).execute()
        return FeedbackResponse(**resp.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating feedback: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit feedback")

@router.get("/summary", response_model=FeedbackSummary)
async def get_feedback_summary(
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Get feedback summary."""
    try:
        resp = supabase.table("feedback").select("*").execute()
        all_feedback = resp.data or []
        
        total = len(all_feedback)
        helpful = sum(1 for f in all_feedback if f.get("rating") == "helpful")
        not_helpful = total - helpful
        percent = (helpful / total * 100) if total > 0 else 0.0
        
        # Last 10 feedback items with comments
        last_10 = sorted(all_feedback, key=lambda x: x.get("created_at", ""), reverse=True)[:10]
        recent_comments = [f for f in last_10 if f.get("comment")]
        
        return FeedbackSummary(
            total_feedback=total,
            helpful_count=helpful,
            not_helpful_count=not_helpful,
            helpful_percentage=round(percent, 1),
            recent_feedback=[FeedbackResponse(**f) for f in recent_comments]
        )
    except Exception as e:
        logger.error(f"Error fetching feedback summary: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return FeedbackSummary(
                total_feedback=0,
                helpful_count=0,
                not_helpful_count=0,
                helpful_percentage=0.0,
                recent_feedback=[]
            )
        raise HTTPException(status_code=500, detail="Failed to fetch feedback summary")

@router.get("", response_model=List[FeedbackResponse])
@router.get("/", response_model=List[FeedbackResponse])
async def list_feedback(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. List all feedback."""
    try:
        offset = (page - 1) * limit
        resp = supabase.table("feedback").select("*").order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        return [FeedbackResponse(**f) for f in resp.data]
    except Exception as e:
        logger.error(f"Error listing feedback: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return []
        raise HTTPException(status_code=500, detail="Failed to fetch feedback")
