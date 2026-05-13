from fastapi import APIRouter, Depends

from app.auth import auth_is_enabled, require_current_user

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me")
def get_current_user_profile(current_user: dict = Depends(require_current_user)):
    return {
        "auth_enabled": auth_is_enabled(),
        "user": current_user,
    }
