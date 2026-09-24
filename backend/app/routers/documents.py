import json
import logging
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query, Response
from pydantic import BaseModel

from app.config import settings
from app.middleware.auth import get_current_user, get_current_user_flexible, require_admin, require_upload_permission
from app.dependencies import get_supabase_client
from app.models.schemas import DocumentResponse, DocumentTagsUpdate, MessageResponse
from app.services.document_processor import document_processor
from app.services.embedding_service import embedding_service
from app.services.chroma_service import chroma_service

router = APIRouter(tags=["Documents"])
logger = logging.getLogger(__name__)

def get_doc_roles_map(supabase) -> dict:
    """Retrieve document -> allowed_roles mapping from settings table."""
    try:
        resp = supabase.table("settings").select("value").eq("key", "document_roles_map").execute()
        if resp.data and resp.data[0].get("value"):
            return json.loads(resp.data[0]["value"])
    except Exception as e:
        logger.warning(f"Failed to fetch document_roles_map: {e}")
    return {}

def set_doc_roles(supabase, doc_id: str, roles: List[str]):
    """Persist allowed_roles for a document in the settings table."""
    try:
        current_map = get_doc_roles_map(supabase)
        current_map[str(doc_id)] = roles
        supabase.table("settings").upsert({
            "key": "document_roles_map",
            "value": json.dumps(current_map)
        }, on_conflict="key").execute()
    except Exception as e:
        logger.error(f"Failed to save doc roles for {doc_id}: {e}")


@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    title: Optional[str] = Form(None),
    department: Optional[str] = Form(None),
    content_type: str = Form("text_only"),
    tags: str = Form(""),
    allowed_departments: str = Form(""),
    allowed_roles: str = Form(""),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_upload_permission),
    supabase = Depends(get_supabase_client)
):
    """Upload a PDF/TXT document, process text chunks (Text, OCR Scanned, or Hybrid Combination), and save to Supabase."""
    try:
        document_id = str(uuid.uuid4())
        doc_title = title.strip() if (title and title.strip()) else (Path(file.filename).stem if file.filename else "Document")
        doc_dept = department.strip() if (department and department.strip()) else "General"
        file_bytes = await file.read()
        
        # Validate file size
        max_size = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if len(file_bytes) > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB."
            )
        
        # Parse tags, allowed_departments & allowed_roles
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

        if isinstance(allowed_roles, str):
            allowed_roles_list = [r.strip() for r in allowed_roles.split(",") if r.strip()]
        elif isinstance(allowed_roles, list):
            allowed_roles_list = [r.strip() for item in allowed_roles for r in item.split(",") if r.strip()]
        else:
            allowed_roles_list = []
        if not allowed_roles_list:
            allowed_roles_list = ["All"]

        # Save document roles to settings mapping
        set_doc_roles(supabase, document_id, allowed_roles_list)
        
        # Upload file to Supabase storage
        storage_path = f"{document_id}/{file.filename}"
        supabase.storage.from_("documents").upload(storage_path, file_bytes)
        
        file_type = "pdf" if file.filename.lower().endswith(".pdf") else "txt"
        
        metadata = {
            "id": document_id,
            "title": doc_title,
            "filename": file.filename,
            "file_type": file_type,
            "content_type": content_type,
            "file_size_bytes": len(file_bytes),
            "storage_path": storage_path,
            "department": doc_dept,
            "tags": tags_list,
            "allowed_departments": allowed_depts_list,
            "uploaded_by": str(current_user["id"]),
            "processing_status": "processing"
        }
        
        # Insert into documents table with resilient fallback for demo users & schema cache
        db_metadata = {k: v for k, v in metadata.items() if k != "allowed_roles"}
        try:
            doc_resp = supabase.table("documents").insert(db_metadata).execute()
        except Exception as insert_err:
            if "violates foreign key constraint" in str(insert_err) and db_metadata.get("uploaded_by"):
                logger.warning(f"FK violation on uploaded_by, retrying with None: {insert_err}")
                db_metadata["uploaded_by"] = None
                doc_resp = supabase.table("documents").insert(db_metadata).execute()
            else:
                raise insert_err

        if not doc_resp.data:
            raise HTTPException(status_code=500, detail="Failed to save document metadata")
            
        # Process document text into LangChain Documents with selected multi-modal mode
        # Pass allowed_roles in processor metadata for Chroma chunk attribution
        processor_metadata = dict(metadata)
        processor_metadata["allowed_roles"] = allowed_roles_list

        chunks = document_processor.process_document(
            file_bytes=file_bytes,
            filename=file.filename,
            document_id=document_id,
            metadata=processor_metadata,
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
        
        res_data = updated_doc_resp.data[0]
        res_data["allowed_roles"] = allowed_roles_list
        return DocumentResponse(**res_data)
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.get("", response_model=List[DocumentResponse])
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
    """List documents with filters and RBAC role/department visibility enforcement."""
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
        
        roles_map = get_doc_roles_map(supabase)
        user_role = current_user.get("role", "employee")
        is_admin = user_role == "admin"

        result_docs = []
        for doc in resp.data:
            doc_id_str = str(doc.get("id"))
            doc_roles = doc.get("allowed_roles") or roles_map.get(doc_id_str) or ["All"]
            doc["allowed_roles"] = doc_roles
            
            # Role access check for non-admins
            if not is_admin:
                if "All" not in doc_roles and user_role not in doc_roles:
                    continue
            result_docs.append(DocumentResponse(**doc))

        return result_docs
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
    """Get single document details with department & role checks."""
    try:
        resp = supabase.table("documents").select("*").eq("id", document_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = resp.data[0]
        roles_map = get_doc_roles_map(supabase)
        doc_roles = doc.get("allowed_roles") or roles_map.get(str(document_id)) or ["All"]
        doc["allowed_roles"] = doc_roles
        
        # Access control: check if document is allowed for user's department and role
        if current_user.get("role") != "admin":
            user_dept = current_user.get("department")
            user_role = current_user.get("role", "employee")
            allowed = doc.get("allowed_departments") or ["All"]
            
            if "All" not in allowed and (not user_dept or user_dept not in allowed):
                raise HTTPException(status_code=403, detail="Access denied: Department not authorized")
            if "All" not in doc_roles and user_role not in doc_roles:
                raise HTTPException(status_code=403, detail="Access denied: Role not authorized")
                
        return DocumentResponse(**doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching document: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch document")

@router.get("/{document_id}/file")
async def get_document_file(
    document_id: str,
    download: bool = Query(False),
    current_user: dict = Depends(get_current_user_flexible),
    supabase = Depends(get_supabase_client)
):
    """Securely stream/serve document file (PDF, TXT) for inline browser preview or download."""
    try:
        resp = supabase.table("documents").select("*").eq("id", document_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = resp.data[0]
        roles_map = get_doc_roles_map(supabase)
        doc_roles = doc.get("allowed_roles") or roles_map.get(str(document_id)) or ["All"]
        
        # Access control
        if current_user.get("role") != "admin":
            user_dept = current_user.get("department")
            user_role = current_user.get("role", "employee")
            allowed = doc.get("allowed_departments") or ["All"]
            doc_dept = doc.get("department")
            
            is_dept_permitted = (
                "All" in allowed or 
                doc_dept in ["All", "General", None] or 
                (user_dept and user_dept in allowed) or
                (user_dept and user_dept == doc_dept)
            )
            is_role_permitted = (
                "All" in doc_roles or
                user_role in doc_roles
            )
            if not (is_dept_permitted and is_role_permitted):
                raise HTTPException(status_code=403, detail="Access denied to this document")
                
        storage_path = doc.get("storage_path") or f"{document_id}/{doc['filename']}"
        file_bytes = supabase.storage.from_("documents").download(storage_path)
        
        filename = doc.get("filename", "document.pdf")
        safe_filename = filename.replace('"', '\\"')
        
        if filename.lower().endswith(".pdf"):
            media_type = "application/pdf"
        elif filename.lower().endswith(".txt"):
            media_type = "text/plain; charset=utf-8"
        else:
            media_type = "application/octet-stream"
            
        disposition = "attachment" if download else "inline"
        headers = {
            "Content-Disposition": f'{disposition}; filename="{safe_filename}"',
            "Cache-Control": "public, max-age=3600"
        }
        
        return Response(content=file_bytes, media_type=media_type, headers=headers)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error serving document file: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to serve file: {str(e)}")

@router.get("/{document_id}/download")
async def download_document_file(
    document_id: str,
    current_user: dict = Depends(get_current_user_flexible),
    supabase = Depends(get_supabase_client)
):
    """Direct download endpoint with attachment header."""
    return await get_document_file(document_id, download=True, current_user=current_user, supabase=supabase)

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

        # Remove from document_roles_map
        roles_map = get_doc_roles_map(supabase)
        if str(document_id) in roles_map:
            roles_map.pop(str(document_id), None)
            try:
                supabase.table("settings").upsert({
                    "key": "document_roles_map",
                    "value": json.dumps(roles_map)
                }, on_conflict="key").execute()
            except Exception:
                pass
        
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
    """Admin only. Update tags, allowed_departments, and allowed_roles."""
    try:
        update_payload = {}
        if update_data.tags is not None:
            update_payload["tags"] = update_data.tags
        if update_data.allowed_departments is not None:
            update_payload["allowed_departments"] = update_data.allowed_departments
            
        if update_data.allowed_roles is not None:
            set_doc_roles(supabase, document_id, update_data.allowed_roles)

        if not update_payload:
            resp = supabase.table("documents").select("*").eq("id", document_id).execute()
            if not resp.data:
                raise HTTPException(status_code=404, detail="Document not found")
            doc = resp.data[0]
            roles_map = get_doc_roles_map(supabase)
            doc["allowed_roles"] = doc.get("allowed_roles") or update_data.allowed_roles or roles_map.get(str(document_id)) or ["All"]
            return DocumentResponse(**doc)
            
        resp = supabase.table("documents").update(update_payload).eq("id", document_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Document not found")
            
        doc = resp.data[0]
        roles_map = get_doc_roles_map(supabase)
        doc["allowed_roles"] = doc.get("allowed_roles") or update_data.allowed_roles or roles_map.get(str(document_id)) or ["All"]
        return DocumentResponse(**doc)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating document tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update document")

