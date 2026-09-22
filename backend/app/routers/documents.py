import logging
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from pydantic import BaseModel

from app.config import settings
from app.middleware.auth import get_current_user, require_admin
from app.dependencies import get_supabase_client
from app.models.schemas import DocumentResponse, DocumentTagsUpdate, MessageResponse
from app.services.document_processor import document_processor
from app.services.embedding_service import embedding_service
from app.services.chroma_service import chroma_service

router = APIRouter(tags=["Documents"])
logger = logging.getLogger(__name__)

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    title: str = Form(...),
    department: str = Form(...),
    content_type: str = Form("text_only"),
    tags: str = Form(""),
    allowed_departments: str = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Upload a PDF/TXT document, process text chunks (Text, OCR Scanned, or Hybrid Combination), and save to Supabase."""
    try:
        document_id = str(uuid.uuid4())
        file_bytes = await file.read()
        
        # Parse tags & allowed_departments
        if isinstance(tags, str):
            tags_list = [t.strip() for t in tags.split(",") if t.strip()]
        elif isinstance(tags, list):
            tags_list = [t.strip() for item in tags for t in item.split(",") if t.strip()]
        else:
            tags_list = []

        if isinstance(allowed_departments, str):
            allowed_depts_list = [d.strip() for d in allowed_departments.split(",") if d.strip()]
        elif isinstance(allowed_departments, list):
            allowed_depts_list = [d.strip() for item in allowed_departments for d in item.split(",") if d.strip()]
        else:
            allowed_depts_list = []
        if not allowed_depts_list:
            allowed_depts_list = ["All"]
        
        # Upload file to Supabase storage
        storage_path = f"{document_id}/{file.filename}"
        supabase.storage.from_("documents").upload(storage_path, file_bytes)
        
        file_type = "pdf" if file.filename.lower().endswith(".pdf") else "txt"
        
        metadata = {
            "id": document_id,
            "title": title,
            "filename": file.filename,
            "file_type": file_type,
            "content_type": content_type,
            "file_size_bytes": len(file_bytes),
            "storage_path": storage_path,
            "department": department,
            "tags": tags_list,
            "allowed_departments": allowed_depts_list,
            "uploaded_by": str(current_user["id"]),
            "processing_status": "processing"
        }
        
        # Insert into documents table with resilient fallback for demo users
        try:
            doc_resp = supabase.table("documents").insert(metadata).execute()
        except Exception as insert_err:
            if "violates foreign key constraint" in str(insert_err) and metadata.get("uploaded_by"):
                logger.warning(f"FK violation on uploaded_by, retrying with None: {insert_err}")
                metadata["uploaded_by"] = None
                doc_resp = supabase.table("documents").insert(metadata).execute()
            else:
                raise insert_err

        if not doc_resp.data:
            raise HTTPException(status_code=500, detail="Failed to save document metadata")
            
        # Process document text into LangChain Documents with selected multi-modal mode
        chunks = document_processor.process_document(
            file_bytes=file_bytes,
            filename=file.filename,
            document_id=document_id,
            metadata=metadata,
            content_type=content_type
        )
        chunk_count = len(chunks)
        
        if chunk_count > 0:
            # Store LangChain Documents in ChromaDB (auto-computes embeddings)
            chroma_service.add_documents(chunks)
        
        # Update processing status
        updated_doc_resp = supabase.table("documents").update({
            "processing_status": "completed",
            "chunk_count": chunk_count
        }).eq("id", document_id).execute()
        
        return DocumentResponse(**updated_doc_resp.data[0])
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    department: Optional[str] = None,
    tags: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """List documents with filters."""
    try:
        query = supabase.table("documents").select("*")
        
        # Access control: users can see documents matching their department or shared with 'All'
        if current_user.get("role") != "admin":
            user_dept = current_user.get("department")
            if user_dept:
                query = query.overlaps("allowed_departments", [user_dept, "All"])
                
        # Filters
        if department and department != "All":
            query = query.eq("department", department)
        if tags:
            tag_list = [t.strip() for t in tags.split(",")]
            query = query.contains("tags", tag_list)
        if search:
            query = query.ilike("title", f"%{search}%")
            
        # Pagination
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        
        resp = query.order("created_at", desc=True).execute()
        return [DocumentResponse(**doc) for doc in resp.data]
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        if settings.ENVIRONMENT == "development":
            return []
        raise HTTPException(status_code=500, detail="Failed to fetch documents")

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Get single document details."""
    try:
        resp = supabase.table("documents").select("*").eq("id", document_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = resp.data[0]
        
        # Access control: check if document is allowed for user's department or 'All'
        if current_user.get("role") != "admin":
            user_dept = current_user.get("department")
            allowed = doc.get("allowed_departments") or ["All"]
            if "All" not in allowed and (not user_dept or user_dept not in allowed):
                raise HTTPException(status_code=403, detail="Access denied")
                
        return DocumentResponse(**doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch document")

@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: str,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Delete a document."""
    try:
        resp = supabase.table("documents").select("*").eq("id", document_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = resp.data[0]
        
        # Delete from ChromaDB
        chroma_service.delete_document_chunks(document_id)
        
        # Delete from storage using exact storage path
        file_path = doc.get("storage_path") or f"{document_id}/{doc['filename']}"
        try:
            supabase.storage.from_("documents").remove([file_path])
        except Exception as e:
            logger.warning(f"Failed to delete file from storage: {e}")
            
        # Delete from DB
        supabase.table("documents").delete().eq("id", document_id).execute()
        
        return MessageResponse(message="Document deleted successfully", success=True)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete document")

@router.put("/{document_id}/tags", response_model=DocumentResponse)
async def update_tags(
    document_id: str,
    update_data: DocumentTagsUpdate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Update tags and allowed_departments."""
    try:
        update_payload = {}
        if update_data.tags is not None:
            update_payload["tags"] = update_data.tags
        if update_data.allowed_departments is not None:
            update_payload["allowed_departments"] = update_data.allowed_departments
            
        if not update_payload:
            resp = supabase.table("documents").select("*").eq("id", document_id).execute()
            if not resp.data:
                raise HTTPException(status_code=404, detail="Document not found")
            return DocumentResponse(**resp.data[0])
            
        resp = supabase.table("documents").update(update_payload).eq("id", document_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        return DocumentResponse(**resp.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update document")
