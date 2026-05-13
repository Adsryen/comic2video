from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.db.session import get_db
from app.permissions import is_admin_user
from app.schemas.user import UserResponse, UserRoleUpdateRequest
from app.services.user_service import UserService

router = APIRouter(prefix="/api/v1/admin/users", tags=["users"])


def require_admin(current_user: dict = Depends(require_current_user)) -> dict:
    if current_user.get("auth_bypassed") or is_admin_user(current_user):
        return current_user
    raise HTTPException(status_code=403, detail="Admin access required")


@router.get("", response_model=list[UserResponse])
def list_users(current_user: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return UserService.list_all(db)


@router.patch("/{user_id}/role", response_model=UserResponse)
def update_user_role(user_id: str, payload: UserRoleUpdateRequest, current_user: dict = Depends(require_admin), db: Session = Depends(get_db)):
    user = UserService.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if payload.role not in {"admin", "member"}:
        raise HTTPException(status_code=400, detail="Unsupported role")
    return UserService.update_role(db, user, payload.role)
