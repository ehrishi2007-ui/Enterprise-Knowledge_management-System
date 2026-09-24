"""Role & Permission management router for flexible institutional RBAC."""

import json
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import get_supabase_client
from app.middleware.auth import get_current_user, require_admin
from app.models.schemas import RoleCreate, RolePermissionUpdate, RolePermissionResponse, MessageResponse

router = APIRouter(tags=["Roles & Permissions"])
logger = logging.getLogger(__name__)

DEFAULT_ROLES = [
    {
        "role_name": "admin",
        "display_name": "Administrator",
        "description": "Full institutional and administrative access",
        "can_upload": True,
        "can_delete": True,
        "can_manage_users": True,
        "can_manage_departments": True,
        "can_manage_settings": True,
        "is_custom": False,
        "color": "teal"
    },
    {
        "role_name": "lecturer",
        "display_name": "Lecturer / Faculty",
        "description": "Academic faculty with document publishing rights",
        "can_upload": True,
        "can_delete": False,
        "can_manage_users": False,
        "can_manage_departments": False,
        "can_manage_settings": False,
        "is_custom": False,
        "color": "purple"
    },
    {
        "role_name": "student",
        "display_name": "Student",
        "description": "Student access to learning materials and query assistant",
        "can_upload": False,
        "can_delete": False,
        "can_manage_users": False,
        "can_manage_departments": False,
        "can_manage_settings": False,
        "is_custom": False,
        "color": "blue"
    },
    {
        "role_name": "employee",
        "display_name": "Employee / Staff",
        "description": "General institutional staff member",
        "can_upload": False,
        "can_delete": False,
        "can_manage_users": False,
        "can_manage_departments": False,
        "can_manage_settings": False,
        "is_custom": False,
        "color": "emerald"
    },
    {
        "role_name": "staff",
        "display_name": "Support Staff",
        "description": "Departmental support staff with upload access",
        "can_upload": True,
        "can_delete": False,
        "can_manage_users": False,
        "can_manage_departments": False,
        "can_manage_settings": False,
        "is_custom": False,
        "color": "orange"
    }
]

def load_roles_from_db(supabase) -> List[dict]:
    try:
        resp = supabase.table("settings").select("value").eq("key", "custom_roles_and_permissions").execute()
        if resp.data and resp.data[0].get("value"):
            roles = json.loads(resp.data[0]["value"])
            if isinstance(roles, list) and len(roles) > 0:
                return roles
    except Exception as e:
        logger.warning(f"Failed to fetch roles from settings: {e}")
    return DEFAULT_ROLES

def save_roles_to_db(supabase, roles: List[dict]):
    try:
        supabase.table("settings").upsert({
            "key": "custom_roles_and_permissions",
            "value": json.dumps(roles)
        }, on_conflict="key").execute()
    except Exception as e:
        logger.error(f"Failed to save roles to settings: {e}")
        raise HTTPException(status_code=500, detail="Failed to save roles configuration")

@router.get("", response_model=List[RolePermissionResponse])
@router.get("/", response_model=List[RolePermissionResponse])
async def list_roles(
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """List all available roles and their permission toggles."""
    roles = load_roles_from_db(supabase)
    return [RolePermissionResponse(**r) for r in roles]

@router.post("", response_model=RolePermissionResponse)
@router.post("/", response_model=RolePermissionResponse)
async def create_custom_role(
    role_in: RoleCreate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Create a new custom role with specific permissions."""
    roles = load_roles_from_db(supabase)
    clean_name = role_in.role_name.strip().lower().replace(" ", "_")
    
    if any(r["role_name"] == clean_name for r in roles):
        raise HTTPException(status_code=400, detail=f"Role '{clean_name}' already exists")
    
    new_role = {
        "role_name": clean_name,
        "display_name": role_in.display_name.strip(),
        "description": role_in.description or f"Custom role: {role_in.display_name}",
        "can_upload": role_in.can_upload,
        "can_delete": role_in.can_delete,
        "can_manage_users": role_in.can_manage_users,
        "can_manage_departments": role_in.can_manage_departments,
        "can_manage_settings": role_in.can_manage_settings,
        "is_custom": True,
        "color": role_in.color or "teal"
    }
    
    roles.append(new_role)
    save_roles_to_db(supabase, roles)
    return RolePermissionResponse(**new_role)

@router.put("/{role_name}", response_model=RolePermissionResponse)
async def update_role_permissions(
    role_name: str,
    update_in: RolePermissionUpdate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Update permissions and details for any role."""
    roles = load_roles_from_db(supabase)
    target = None
    for r in roles:
        if r["role_name"] == role_name.lower():
            target = r
            break
            
    if not target:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
        
    update_data = update_in.dict(exclude_unset=True)
    for k, v in update_data.items():
        if v is not None:
            target[k] = v
            
    # Protect admin role from losing critical permissions
    if target["role_name"] == "admin":
        target["can_upload"] = True
        target["can_delete"] = True
        target["can_manage_users"] = True
        target["can_manage_settings"] = True
        
    save_roles_to_db(supabase, roles)
    return RolePermissionResponse(**target)

@router.delete("/{role_name}", response_model=MessageResponse)
async def delete_custom_role(
    role_name: str,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Delete a custom role."""
    built_in = {"admin", "lecturer", "student", "employee", "staff"}
    if role_name.lower() in built_in:
        raise HTTPException(status_code=400, detail=f"Cannot delete built-in role '{role_name}'")
        
    roles = load_roles_from_db(supabase)
    initial_len = len(roles)
    roles = [r for r in roles if r["role_name"] != role_name.lower()]
    
    if len(roles) == initial_len:
        raise HTTPException(status_code=404, detail=f"Role '{role_name}' not found")
        
    save_roles_to_db(supabase, roles)
    return MessageResponse(message=f"Custom role '{role_name}' deleted successfully", success=True)
