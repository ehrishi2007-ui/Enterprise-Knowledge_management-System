import logging
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings as app_settings
from app.middleware.auth import get_current_user, require_admin
from app.dependencies import get_supabase_client
from app.models.schemas import SettingsResponse, SettingsUpdate, SettingItem

router = APIRouter(tags=["Settings"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=SettingsResponse)
async def get_settings(
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Get system settings."""
    try:
        resp = supabase.table("settings").select("*").execute()
        settings = [SettingItem(**s) for s in resp.data]
        return SettingsResponse(settings=settings)
    except Exception as e:
        logger.error(f"Error fetching settings: {str(e)}")
        if app_settings.ENVIRONMENT == "development":
            return SettingsResponse(settings=[
                SettingItem(key="system_prompt", value="You are an enterprise knowledge assistant. Answer based on the provided sources."),
                SettingItem(key="temperature", value=str(app_settings.DEFAULT_TEMPERATURE)),
                SettingItem(key="top_k", value=str(app_settings.TOP_K_RESULTS))
            ])
        raise HTTPException(status_code=500, detail="Failed to fetch settings")

@router.put("/", response_model=SettingsResponse)
async def update_settings(
    update_data: SettingsUpdate,
    current_user: dict = Depends(require_admin),
    supabase = Depends(get_supabase_client)
):
    """Admin only. Update system settings."""
    try:
        settings_dict = update_data.settings
        for key, value in settings_dict.items():
            # Upsert setting using correct column names 'key' and 'value'
            supabase.table("settings").upsert({
                "key": str(key),
                "value": str(value),
                "updated_by": str(current_user["id"])
            }, on_conflict="key").execute()
            
        resp = supabase.table("settings").select("*").execute()
        settings = [SettingItem(**s) for s in resp.data]
        return SettingsResponse(settings=settings)
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update settings")
