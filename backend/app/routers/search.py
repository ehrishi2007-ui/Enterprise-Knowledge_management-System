import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query

from app.middleware.auth import get_current_user
from app.dependencies import get_supabase_client
from app.models.schemas import SearchResponse, SearchResult
from app.services.chroma_service import chroma_service

router = APIRouter(tags=["Search"])
logger = logging.getLogger(__name__)

@router.get("", response_model=SearchResponse)
@router.get("/", response_model=SearchResponse)
async def search_documents(
    q: str = Query(..., min_length=1),
    search_type: str = Query("semantic", pattern="^(semantic|keyword)$"),
    department: Optional[str] = None,
    tags: Optional[str] = None,
    file_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Search across documents using LangChain semantic search or PostgreSQL keyword search."""
    try:
        results = []
        user_dept = current_user.get("department")
        is_admin = current_user.get("role") == "admin"
        
        if search_type == "semantic":
            # Build filters for LangChain Chroma
            filter_arg = None
            if department and department != "All":
                filter_arg = {"department": department}
            elif not is_admin and user_dept and user_dept != "All":
                filter_arg = {
                    "$or": [
                        {"department": user_dept},
                        {"department": "All"}
                    ]
                }

            search_tuples = chroma_service.similarity_search_with_relevance_scores(
                query=q,
                k=limit,
                filter=filter_arg
            )
            
            seen_docs = set()
            for doc, score in search_tuples:
                doc_id = doc.metadata.get("document_id")
                doc_title = doc.metadata.get("title", doc.metadata.get("document_name", "Untitled Document"))
                doc_dept = doc.metadata.get("department")
                doc_tags = doc.metadata.get("tags", [])
                
                # Deduplicate by document if multiple chunks match
                dedup_key = f"{doc_id}_{doc_title}"
                if dedup_key in seen_docs:
                    continue
                seen_docs.add(dedup_key)

                # Ensure tags match filter if specified
                if tags:
                    req_tags = [t.strip().lower() for t in tags.split(",") if t.strip()]
                    doc_tags_lower = [t.lower() for t in doc_tags]
                    if not any(t in doc_tags_lower for t in req_tags):
                        continue

                results.append(SearchResult(
                    id=str(doc_id) if doc_id else None,
                    document_id=str(doc_id) if doc_id else None,
                    title=doc_title,
                    department=doc_dept,
                    tags=doc_tags if isinstance(doc_tags, list) else [],
                    snippet=doc.page_content[:300] + ("..." if len(doc.page_content) > 300 else ""),
                    score=round(float(score), 3) if score is not None else 1.0,
                    relevance_score=round(float(score), 3) if score is not None else 1.0,
                    page_number=doc.metadata.get("page", doc.metadata.get("page_number", 1))
                ))
        else:
            # Keyword search via Supabase
            query = supabase.table("documents").select("*")
            query = query.ilike("title", f"%{q}%")
            
            if department and department != "All":
                query = query.eq("department", department)
            if not is_admin and user_dept:
                query = query.overlaps("allowed_departments", [user_dept, "All"])
            if tags:
                tag_list = [t.strip() for t in tags.split(",") if t.strip()]
                query = query.contains("tags", tag_list)
                
            resp = query.limit(limit).execute()
            
            for doc in resp.data:
                results.append(SearchResult(
                    id=doc["id"],
                    document_id=doc["id"],
                    title=doc.get("title", ""),
                    filename=doc.get("filename"),
                    department=doc.get("department"),
                    tags=doc.get("tags", []),
                    snippet=f"Document '{doc.get('title', '')}' matched by keyword query in title/metadata.",
                    score=1.0,
                    relevance_score=1.0,
                    created_at=doc.get("created_at")
                ))
                
        return SearchResponse(query=q, results=results, total_count=len(results), search_type=search_type)
    except Exception as e:
        logger.error(f"Error in search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Search failed")
