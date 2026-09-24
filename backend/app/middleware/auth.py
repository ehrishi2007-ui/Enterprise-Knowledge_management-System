from fastapi import Depends, HTTPException, Request, Query, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings
from app.dependencies import get_supabase_client
import uuid
from typing import Optional

security = HTTPBearer(auto_error=False)

def verify_token(token: str) -> dict:
    """Decodes and verifies a Supabase JWT."""
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_user_from_raw_token(token: str) -> dict:
    """Helper to authenticate and load user profile given a raw token string."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Development demo token support (supports admin, lecturer, student, employee, staff, etc.)
    if settings.ENVIRONMENT == "development" and token.startswith("demo-token"):
        token_lower = token.lower()
        if "admin" in token_lower:
            return {
                "id": "00000000-0000-0000-0000-000000000001",
                "email": "admin@hitam.edu.in",
                "role": "admin",
                "department": "Operations",
                "display_name": "Rachel Collins (Admin)",
                "is_active": True
            }
        elif "lecturer" in token_lower or "faculty" in token_lower:
            return {
                "id": "d946a8cb-c9d6-42ef-bbd1-15fb67dffcf7",
                "email": "lecturer@hitam.edu.in",
                "role": "lecturer",
                "department": "Computer Science",
                "display_name": "Dr. Marcus Vance",
                "is_active": True
            }
        elif "student" in token_lower:
            return {
                "id": "deee83ee-5369-4464-862b-7366c5f74b70",
                "email": "student@hitam.edu.in",
                "role": "student",
                "department": "Engineering",
                "display_name": "Jordan Lee",
                "is_active": True
            }
        else: # Default employee / staff
            return {
                "id": "00000000-0000-0000-0000-000000000002",
                "email": "employee@hitam.edu.in",
                "role": "employee",
                "department": "Engineering",
                "display_name": "Alex Morgan",
                "is_active": True
            }

    payload = verify_token(token)
    
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject (sub)",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    supabase = get_supabase_client()
    response = supabase.table("profiles").select("*").eq("id", str(user_id)).execute()
    
    if not response.data:
        user_meta = payload.get("user_metadata", {})
        display_name = user_meta.get("display_name") or user_meta.get("full_name") or (payload.get("email", "").split("@")[0] if payload.get("email") else "User")
        user = {
            "id": str(user_id),
            "display_name": display_name,
            "role": user_meta.get("role", "employee"),
            "department": user_meta.get("department", "General"),
            "is_active": True
        }
        try:
            supabase.table("profiles").insert(user).execute()
        except Exception:
            pass
    else:
        user = response.data[0]
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )
        
    return {
        "id": str(user_id),
        "email": payload.get("email") or user.get("email"),
        "role": user.get("role", "employee"),
        "department": user.get("department"),
        "display_name": user.get("display_name", ""),
        "is_active": user.get("is_active", True)
    }

def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    """Extracts token from Authorization header and retrieves user profile."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return get_user_from_raw_token(credentials.credentials)

def get_current_user_flexible(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    token: Optional[str] = Query(None)
) -> dict:
    """Extracts token from either Authorization header or ?token= query param (for iframes/direct file streams)."""
    raw_token = None
    if credentials and credentials.credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token
    elif "authorization" in request.headers:
        auth_header = request.headers.get("authorization")
        if auth_header.startswith("Bearer "):
            raw_token = auth_header[7:].strip()
            
    if not raw_token:
        # Development fallback: allow demo token in development if query param or header demo
        if settings.ENVIRONMENT == "development":
            raw_token = "demo-token-employee"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated for file access",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    return get_user_from_raw_token(raw_token)

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Requires the user to have the 'admin' role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return current_user
