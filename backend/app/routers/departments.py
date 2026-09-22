"""Department management CRUD router."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.middleware.auth import get_current_user, require_admin
from app.dependencies import get_supabase_client
from app.models.schemas import DepartmentCreate, DepartmentUpdate, DepartmentResponse, MessageResponse

router = APIRouter(tags=["Departments"])
logger = logging.getLogger(__name__)

@router.get("", response_model=List[DepartmentResponse])
@router.get("/", response_model=List[DepartmentResponse])
async def list_departments(
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """List all active departments."""
    try:
        resp = supabase.table("departments").select("*").eq("is_active", True).order("name").execute()
        return [DepartmentResponse(**d) for d in resp.data]
    except Exception as e:
        logger.error(f"Error listing departments: {e}")
        # Fallback defaults if table doesn't exist yet
        if settings.ENVIRONMENT == "development":
            from uuid import uuid4
            defaults = [
                {"id": str(uuid4()), "name": "Engineering", "color": "#3b82f6", "is_active": True},
                {"id": str(uuid4()), "name": "HR", "color": "#f97316", "is_active": True},
                {"id": str(uuid4()), "name": "Finance", "color": "#22c55e", "is_active": True},
                {"id": str(uuid4()), "name": "Legal", "color": "#a855f7", "is_active": True},
                {"id": str(uuid4()), "name": "Operations", "color": "#06b6d4", "is_active": True},
            ]
            return [DepartmentResponse(**d) for d in defaults]
        raise HTTPException(status_code=500, detail="Failed to fetch departments")

@router.post("", response_model=DepartmentResponse)
@router.post("/", response_model=DepartmentResponse)
async def create_department(
    dept_data: DepartmentCreate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Create a new department."""
    try:
        # Check if already exists (even if inactive)
        existing = supabase.table("departments").select("*").eq("name", dept_data.name).execute()
        if existing.data:
            # Reactivate and update
            resp = supabase.table("departments").update({
                "color": dept_data.color or "#599692",
                "description": dept_data.description,
                "is_active": True
            }).eq("id", existing.data[0]["id"]).execute()
            return DepartmentResponse(**resp.data[0])

        resp = supabase.table("departments").insert({
            "name": dept_data.name,
            "color": dept_data.color or "#599692",
            "description": dept_data.description,
            "is_active": True
        }).execute()
        
        if not resp.data:
            raise HTTPException(status_code=400, detail="Failed to create department")
        return DepartmentResponse(**resp.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating department: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: str,
    update_data: DepartmentUpdate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Update a department."""
    try:
        update_payload = {k: v for k, v in update_data.dict(exclude_unset=True).items() if v is not None}
        if not update_payload:
            resp = supabase.table("departments").select("*").eq("id", department_id).execute()
            if not resp.data:
                raise HTTPException(status_code=404, detail="Department not found")
            return DepartmentResponse(**resp.data[0])
        
        resp = supabase.table("departments").update(update_payload).eq("id", department_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="Department not found")
        return DepartmentResponse(**resp.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating department: {e}")
        raise HTTPException(status_code=500, detail="Failed to update department")

@router.delete("/{department_id}", response_model=MessageResponse)
async def delete_department(
    department_id: str,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Delete a department."""
    try:
        supabase.table("departments").delete().eq("id", department_id).execute()
        return MessageResponse(message="Department deleted successfully", success=True)
    except Exception as e:
        logger.error(f"Error deleting department: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete department")
