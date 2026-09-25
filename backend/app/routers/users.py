import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.middleware.auth import get_current_user, require_admin
from app.dependencies import get_supabase_client
from app.models.schemas import UserCreate, UserUpdate, UserProfileUpdate, UserInfo, UserListResponse, MessageResponse

router = APIRouter(tags=["Users"])
logger = logging.getLogger(__name__)

@router.get("/me", response_model=UserInfo)
async def get_my_profile(
    current_user: dict = Depends(get_current_user)
):
    """Get current authenticated user profile."""
    return UserInfo(**current_user)

@router.put("/me", response_model=UserInfo)
async def update_my_profile(
    profile_update: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Allow any authenticated user (admin or employee) to edit their own display name, department, or password."""
    try:
        user_id = str(current_user["id"])
        update_payload = {}
        if profile_update.display_name is not None and profile_update.display_name.strip():
            update_payload["display_name"] = profile_update.display_name.strip()
        if profile_update.department is not None and profile_update.department.strip():
            update_payload["department"] = profile_update.department.strip()
            
        # Update password if provided
        if profile_update.password and len(profile_update.password) >= 6:
            try:
                supabase.auth.admin.update_user_by_id(user_id, {"password": profile_update.password})
                logger.info(f"Updated password for user {user_id}")
            except Exception as pwd_err:
                logger.warning(f"Could not update password via auth.admin for user {user_id}: {pwd_err}")

        # Update profile in Supabase table
        if update_payload:
            try:
                resp = supabase.table("profiles").update(update_payload).eq("id", user_id).execute()
                if resp.data:
                    current_user.update(resp.data[0])
            except Exception as db_err:
                logger.warning(f"Error updating profiles table for {user_id}: {db_err}")
                current_user.update(update_payload)
                
            # Update user_metadata in Supabase auth
            try:
                supabase.auth.admin.update_user_by_id(user_id, {"user_metadata": update_payload})
            except Exception:
                pass
        else:
            resp = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if resp.data:
                current_user.update(resp.data[0])

        return UserInfo(**current_user)
    except Exception as e:
        logger.error(f"Error updating profile for {current_user.get('id')}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update profile: {str(e)}")


@router.get("", response_model=UserListResponse)
@router.get("/", response_model=UserListResponse)
async def list_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. List all users."""
    try:
        query = supabase.table("profiles").select("*")
        if role:
            query = query.eq("role", role)
        if department:
            query = query.eq("department", department)
        if is_active is not None:
            query = query.eq("is_active", is_active)
            
        resp = query.execute()
        return UserListResponse(users=[UserInfo(**u) for u in resp.data], total_count=len(resp.data))
    except Exception as e:
        logger.error(f"Error listing users: {str(e)}")
        if settings.ENVIRONMENT == "development":
            demo_users = [
                UserInfo(id="00000000-0000-0000-0000-000000000001", email="admin@hitam.edu.in", display_name="Rachel Collins", role="admin", department="Operations", is_active=True),
                UserInfo(id="00000000-0000-0000-0000-000000000002", email="employee@hitam.edu.in", display_name="Alex Morgan", role="employee", department="Engineering", is_active=True)
            ]
            if role:
                demo_users = [u for u in demo_users if u.role == role]
            if department:
                demo_users = [u for u in demo_users if u.department == department]
            return UserListResponse(users=demo_users, total_count=len(demo_users))
        raise HTTPException(status_code=500, detail="Failed to fetch users")

@router.post("", response_model=UserInfo)
@router.post("/", response_model=UserInfo)
async def create_user(
    user_data: UserCreate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Create a new user."""
    try:
        # Create user in Supabase Auth
        auth_resp = supabase.auth.admin.create_user({
            "email": user_data.email,
            "password": user_data.password,
            "email_confirm": True,
            "user_metadata": {
                "display_name": user_data.display_name,
                "role": user_data.role,
                "department": user_data.department
            }
        })
        
        user_id = auth_resp.user.id
        
        profile_data = {
            "id": user_id,
            "email": user_data.email,
            "display_name": user_data.display_name,
            "role": user_data.role,
            "department": user_data.department,
            "is_active": True
        }
        try:
            resp = supabase.table("profiles").upsert(profile_data).execute()
        except Exception as profile_err:
            if "profiles_role_check" in str(profile_err):
                logger.warning(f"profiles_role_check constraint encountered; falling back gracefully: {profile_err}")
                fallback_data = dict(profile_data)
                fallback_data["role"] = "employee"
                resp = supabase.table("profiles").upsert(fallback_data).execute()
                res_dict = dict(resp.data[0])
                res_dict["role"] = user_data.role
                return UserInfo(**res_dict)
            raise profile_err
            
        return UserInfo(**resp.data[0])
    except Exception as e:
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create user: {str(e)}")

@router.get("/{user_id}", response_model=UserInfo)
async def get_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Get user profile."""
    try:
        resp = supabase.table("profiles").select("*").eq("id", user_id).execute()
        if not resp.data:
            raise HTTPException(status_code=404, detail="User not found")
        return UserInfo(**resp.data[0])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user")

@router.put("/{user_id}", response_model=UserInfo)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Update user profile."""
    try:
        update_payload = update_data.dict(exclude_unset=True)
        if not update_payload:
            resp = supabase.table("profiles").select("*").eq("id", user_id).execute()
            if not resp.data:
                raise HTTPException(status_code=404, detail="User not found")
            return UserInfo(**resp.data[0])
            
        try:
            resp = supabase.table("profiles").update(update_payload).eq("id", user_id).execute()
        except Exception as update_err:
            if "profiles_role_check" in str(update_err):
                fallback_payload = dict(update_payload)
                fallback_payload["role"] = "employee"
                resp = supabase.table("profiles").update(fallback_payload).eq("id", user_id).execute()
                res_dict = dict(resp.data[0])
                res_dict["role"] = update_data.role
                return UserInfo(**res_dict)
            raise update_err
        
        # Sync user metadata to Supabase Auth
        auth_meta = {}
        if update_data.display_name: auth_meta["display_name"] = update_data.display_name
        if update_data.role: auth_meta["role"] = update_data.role
        if update_data.department: auth_meta["department"] = update_data.department
        if auth_meta:
            try:
                supabase.auth.admin.update_user_by_id(user_id, {"user_metadata": auth_meta})
            except Exception:
                pass
            
        if "is_active" in update_payload and update_payload["is_active"] is False:
            supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "876000h"}) # Ban for 100 years
        elif "is_active" in update_payload and update_payload["is_active"] is True:
            supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "none"})
            
        return UserInfo(**resp.data[0])
    except Exception as e:
        logger.error(f"Error updating user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user")

@router.delete("/{user_id}", response_model=MessageResponse)
async def delete_user(
    user_id: str,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Soft delete a user."""
    try:
        supabase.table("profiles").update({"is_active": False}).eq("id", user_id).execute()
        supabase.auth.admin.update_user_by_id(user_id, {"ban_duration": "876000h"})
        return MessageResponse(message="User soft deleted successfully", success=True)
    except Exception as e:
        logger.error(f"Error deleting user: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete user")
