from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.db.models import User


class UserService:
    BOOTSTRAP_ADMIN_EMAILS = {
        email.strip().lower()
        for email in (os.getenv("BOOTSTRAP_ADMIN_EMAILS", "") or "").split(",")
        if email.strip()
    }
    DEFAULT_NEW_USER_ROLE = os.getenv("DEFAULT_NEW_USER_ROLE", "member")

    @staticmethod
    def get_by_external_auth_id(session: Session, external_auth_id: str) -> User | None:
        return session.query(User).filter(User.external_auth_id == external_auth_id).first()

    @staticmethod
    def _resolve_role(email: str | None, auth_payload: dict) -> str:
        normalized_email = (email or "").strip().lower()
        if normalized_email and normalized_email in UserService.BOOTSTRAP_ADMIN_EMAILS:
            return "admin"

        app_metadata = auth_payload.get("app_metadata") or {}
        role = app_metadata.get("role")
        if role in {"admin", "member"}:
            return role

        if UserService.DEFAULT_NEW_USER_ROLE in {"admin", "member"}:
            return UserService.DEFAULT_NEW_USER_ROLE

        return "member"

    @staticmethod
    def upsert_from_auth_payload(session: Session, auth_payload: dict) -> User:
        external_auth_id = auth_payload.get("id")
        if not external_auth_id:
            raise ValueError("Auth payload missing id")

        user = UserService.get_by_external_auth_id(session, external_auth_id)
        email = auth_payload.get("email")
        metadata = auth_payload.get("user_metadata") or {}
        app_metadata = auth_payload.get("app_metadata") or {}
        display_name = (
            metadata.get("full_name")
            or metadata.get("name")
            or metadata.get("user_name")
            or email
        )
        auth_provider = app_metadata.get("provider")
        resolved_role = UserService._resolve_role(email, auth_payload)

        if user is None:
            user = User(
                external_auth_id=external_auth_id,
                email=email,
                display_name=display_name,
                auth_provider=auth_provider,
                role=resolved_role,
            )
            session.add(user)
        else:
            user.email = email
            user.display_name = display_name
            user.auth_provider = auth_provider
            if user.role not in {"admin", "member"}:
                user.role = resolved_role
            session.add(user)

        session.commit()
        session.refresh(user)
        return user

    @staticmethod
    def list_all(session: Session) -> list[User]:
        return session.query(User).order_by(User.created_at.desc()).all()

    @staticmethod
    def get_by_id(session: Session, user_id: str) -> User | None:
        return session.query(User).filter(User.id == user_id).first()

    @staticmethod
    def update_role(session: Session, user: User, role: str) -> User:
        user.role = role
        session.add(user)
        session.commit()
        session.refresh(user)
        return user
