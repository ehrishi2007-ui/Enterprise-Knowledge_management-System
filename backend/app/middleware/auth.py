from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import settings
from app.dependencies import get_supabase_client
import uuid

security = HTTPBearer()

def verify_token(token: str) -> dict:
    """Decodes and verifies a Supabase JWT."""
    try:
        # Supabase uses HS256 and the SUPABASE_JWT_SECRET
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

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Extracts the token, verifies it, and retrieves the user profile from Supabase."""
    token = credentials.credentials

    # Development demo token support for local testing and demo mode
    if settings.ENVIRONMENT == "development" and token.startswith("demo-token"):
        is_employee = "employee" in token.lower()
        demo_id = uuid.UUID("00000000-0000-0000-0000-000000000002") if is_employee else uuid.UUID("00000000-0000-0000-0000-000000000001")
        return {
            "id": demo_id,
            "email": "employee@hitam.edu.in" if is_employee else "admin@hitam.edu.in",
            "role": "employee" if is_employee else "admin",
            "department": "Engineering" if is_employee else "Operations",
            "display_name": "Alex Morgan" if is_employee else "Rachel Collins",
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
        
    # Query Supabase for the user's profile
    supabase = get_supabase_client()
    response = supabase.table("profiles").select("*").eq("id", str(user_id)).execute()
    
    if not response.data:
        # Fallback profile if user was created directly in Supabase Auth
        user_meta = payload.get("user_metadata", {})
        display_name = user_meta.get("display_name") or user_meta.get("full_name") or (payload.get("email", "").split("@")[0] if payload.get("email") else "User")
        user = {
            "id": str(user_id),
            "display_name": display_name,
            "role": user_meta.get("role", "employee"),
            "department": user_meta.get("department", "Engineering"),
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
        "id": user_id,
        "email": payload.get("email") or user.get("email"),
        "role": user.get("role", "employee"),
        "department": user.get("department"),
        "display_name": user.get("display_name", ""),
        "is_active": user.get("is_active", True)
    }

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Requires the user to have the 'admin' role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )
    return current_user
