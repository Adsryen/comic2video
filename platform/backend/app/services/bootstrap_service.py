from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.services.user_service import UserService


class BootstrapService:
    @staticmethod
    def ensure_local_admin(session: Session) -> None:
        username = (os.getenv("LOCAL_ADMIN_USERNAME") or "admin").strip().lower()
        password = os.getenv("LOCAL_ADMIN_PASSWORD") or "admin"
        display_name = (os.getenv("LOCAL_ADMIN_DISPLAY_NAME") or "Administrator").strip() or "Administrator"
        enabled = (os.getenv("LOCAL_ADMIN_ENABLED") or "true").strip().lower() in {"1", "true", "yes", "on"}

        if not enabled or not username or not password:
            return

        admin_email = username if "@" in username else f"{username}@local"
        existing_user = UserService.get_by_email(session, admin_email)
        if existing_user:
            if existing_user.role != "admin":
                UserService.update_role(session, existing_user, "admin")
            return

        user, _identity = UserService.create_local_user(
            session,
            email=admin_email,
            password=password,
            display_name=display_name,
        )
        if user.role != "admin":
            UserService.update_role(session, user, "admin")
