import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.config import settings
from app.middleware.auth import get_current_user
from app.dependencies import get_supabase_client
from app.models.schemas import (
    ChatRequest, ChatResponse, ConversationSummary,
    ConversationDetail, ConversationRename, MessageResponse,
    EmployeeDashboard
)
from app.services.rag_pipeline import rag_pipeline

router = APIRouter(tags=["Chat"])
logger = logging.getLogger(__name__)

@router.post("/ask", response_model=ChatResponse)
async def ask_question(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Ask a question to the RAG pipeline."""
    try:
        conversation_id = request.conversation_id
        
        # If no conversation_id, create a new one
        if not conversation_id:
            conv_resp = supabase.table("conversations").insert({
                "user_id": str(current_user["id"]),
                "title": request.question[:50] + "..." if len(request.question) > 50 else request.question
            }).execute()
            
            if not conv_resp.data:
                raise HTTPException(status_code=500, detail="Failed to create conversation")
            conversation_id = conv_resp.data[0]["id"]
            
        # Fetch conversation history (last 10 messages)
        history_resp = supabase.table("chat_messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=True).limit(10).execute()
        history = history_resp.data[::-1] if history_resp.data else [] # reverse to chronological
        
        # Call RAG pipeline (returns dict with answer, sources, response_time_ms)
        # Admins have access to all documents across all departments
        dept_filter = "All" if current_user.get("role") == "admin" else current_user.get("department")
        rag_result = rag_pipeline.ask(
            question=request.question,
            conversation_history=history,
            user_department=dept_filter,
            supabase_client=supabase
        )
        
        answer_text = rag_result.get("answer", "")
        sources = rag_result.get("sources", [])
        response_time_ms = rag_result.get("response_time_ms", 0)
        
        # Store user message
        supabase.table("chat_messages").insert({
            "conversation_id": str(conversation_id),
            "role": "user",
            "content": request.question
        }).execute()
        
        # Store assistant message
        msg_resp = supabase.table("chat_messages").insert({
            "conversation_id": str(conversation_id),
            "role": "assistant",
            "content": answer_text,
            "sources": sources,
            "response_time_ms": response_time_ms
        }).execute()
        
        # Update conversation updated_at
        supabase.table("conversations").update({"updated_at": datetime.now(timezone.utc).isoformat()}).eq("id", str(conversation_id)).execute()
        
        message_id = msg_resp.data[0]["id"] if msg_resp.data else None
        
        return ChatResponse(
            conversation_id=conversation_id,
            message_id=message_id,
            answer=answer_text,
            sources=sources,
            response_time_ms=response_time_ms
        )
    except Exception as e:
        logger.error(f"Error in ask: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred while processing the request.")

@router.get("/conversations", response_model=List[ConversationSummary])
async def list_conversations(
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """List user's conversations."""
    try:
        resp = supabase.table("conversations").select("*, chat_messages(count)").eq("user_id", str(current_user["id"])).order("updated_at", desc=True).execute()
        
        results = []
        for conv in resp.data:
            cm = conv.get("chat_messages")
            if isinstance(cm, list) and len(cm) > 0 and isinstance(cm[0], dict) and "count" in cm[0]:
                message_count = cm[0]["count"]
            elif isinstance(cm, list):
                message_count = len(cm)
            else:
                message_count = 0

            results.append(ConversationSummary(
                id=conv["id"],
                title=conv["title"],
                created_at=conv["created_at"],
                updated_at=conv["updated_at"],
                is_bookmarked=conv.get("is_bookmarked", False),
                message_count=message_count
            ))
        return results
    except Exception as e:
        logger.error(f"Error in list_conversations: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return []
        raise HTTPException(status_code=500, detail="Failed to fetch conversations")

@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Get conversation details with all messages."""
    try:
        conv_resp = supabase.table("conversations").select("*").eq("id", conversation_id).eq("user_id", current_user["id"]).execute()
        if not conv_resp.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        msg_resp = supabase.table("chat_messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).execute()
        
        return ConversationDetail(
            id=conv_resp.data[0]["id"],
            title=conv_resp.data[0]["title"],
            created_at=conv_resp.data[0]["created_at"],
            updated_at=conv_resp.data[0]["updated_at"],
            is_bookmarked=conv_resp.data[0].get("is_bookmarked", False),
            messages=msg_resp.data
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in get_conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch conversation")

@router.put("/conversations/{conversation_id}/rename", response_model=MessageResponse)
async def rename_conversation(
    conversation_id: str,
    rename_data: ConversationRename,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Rename a conversation."""
    try:
        # Check ownership
        conv_resp = supabase.table("conversations").select("id").eq("id", conversation_id).eq("user_id", current_user["id"]).execute()
        if not conv_resp.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        supabase.table("conversations").update({"title": rename_data.title}).eq("id", conversation_id).execute()
        return MessageResponse(message="Conversation renamed successfully", success=True)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error renaming conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to rename conversation")

@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Delete a conversation."""
    try:
        # Check ownership
        conv_resp = supabase.table("conversations").select("id").eq("id", conversation_id).eq("user_id", current_user["id"]).execute()
        if not conv_resp.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        supabase.table("conversations").delete().eq("id", conversation_id).execute()
        return MessageResponse(message="Conversation deleted", success=True)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting conversation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete conversation")

@router.post("/conversations/{conversation_id}/bookmark")
async def toggle_bookmark(
    conversation_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Toggle bookmark state of a conversation."""
    try:
        conv_resp = supabase.table("conversations").select("is_bookmarked").eq("id", conversation_id).eq("user_id", current_user["id"]).execute()
        if not conv_resp.data:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
        current_state = conv_resp.data[0].get("is_bookmarked", False)
        new_state = not current_state
        
        supabase.table("conversations").update({"is_bookmarked": new_state}).eq("id", conversation_id).execute()
        return {"is_bookmarked": new_state}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle bookmark")

@router.get("/dashboard", response_model=EmployeeDashboard)
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Get employee dashboard data."""
    try:
        user_id = current_user["id"]
        department = current_user.get("department")
        
        # Recent chats
        recent_chats_resp = supabase.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).limit(5).execute()
        
        # Bookmarked chats
        bookmarked_chats_resp = supabase.table("conversations").select("*").eq("user_id", user_id).eq("is_bookmarked", True).execute()
        
        # Announcements
        announcements_resp = supabase.table("announcements").select("*").order("created_at", desc=True).execute()
        
        # Recent documents
        if department and current_user.get("role") != "admin":
            doc_query = supabase.table("documents").select("*").overlaps("allowed_departments", [department, "All"])
        else:
            doc_query = supabase.table("documents").select("*")
            
        recent_docs_resp = doc_query.order("created_at", desc=True).limit(5).execute()
        
        return EmployeeDashboard(
            recent_chats=recent_chats_resp.data,
            recent_documents=recent_docs_resp.data,
            bookmarked_chats=bookmarked_chats_resp.data,
            announcements=announcements_resp.data
        )
    except Exception as e:
        logger.error(f"Error in dashboard: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return EmployeeDashboard(
                recent_chats=[],
                recent_documents=[],
                bookmarked_chats=[],
                announcements=[]
            )
        raise HTTPException(status_code=500, detail="Failed to load dashboard")
