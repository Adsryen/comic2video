from __future__ import annotations

import os
from datetime import datetime

from sqlalchemy.orm import Session

from app.db.models import User, UserIdentity
from app.security.passwords import hash_password


class UserService:
    @staticmethod
    def bootstrap_admin_emails() -> set[str]:
        return {
            email.strip().lower()
            for email in (os.getenv("BOOTSTRAP_ADMIN_EMAILS", "") or "").split(",")
            if email.strip()
        }

    @staticmethod
    def default_new_user_role() -> str:
        return os.getenv("DEFAULT_NEW_USER_ROLE", "member")

    @staticmethod
    def get_by_external_auth_id(session: Session, external_auth_id: str) -> User | None:
        return session.query(User).filter(User.external_auth_id == external_auth_id).first()

    @staticmethod
    def get_by_email(session: Session, email: str) -> User | None:
        return session.query(User).filter(User.email == email.strip().lower()).first()

    @staticmethod
    def get_identity(session: Session, provider: str, provider_user_id: str) -> UserIdentity | None:
        return session.query(UserIdentity).filter(
            UserIdentity.provider == provider,
            UserIdentity.provider_user_id == provider_user_id,
        ).first()

    @staticmethod
    def create_local_user(session: Session, *, email: str, password: str, display_name: str | None = None) -> tuple[User, UserIdentity]:
        normalized_email = email.strip().lower()
        resolved_role = UserService._resolve_role(normalized_email, {})
        user = User(
            external_auth_id=None,
            email=normalized_email,
            password_hash=hash_password(password),
            display_name=display_name or normalized_email,
            auth_provider="local",
            role=resolved_role,
            status="active",
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        identity = UserIdentity(
            user_id=user.id,
            provider="local",
            provider_user_id=normalized_email,
            provider_email=normalized_email,
        )
        session.add(identity)
        session.commit()
        session.refresh(identity)
        return user, identity

    @staticmethod
    def touch_last_login(session: Session, user: User) -> User:
        user.last_login_at = datetime.utcnow()
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    @staticmethod
    def _resolve_role(email: str | None, auth_payload: dict) -> str:
        normalized_email = (email or "").strip().lower()
        if normalized_email and normalized_email in UserService.bootstrap_admin_emails():
            return "admin"

        app_metadata = auth_payload.get("app_metadata") or {}
        role = app_metadata.get("role")
        if role in {"admin", "member"}:
            return role

        default_role = UserService.default_new_user_role()
        if default_role in {"admin", "member"}:
            return default_role

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
                password_hash=None,
                display_name=display_name,
                auth_provider=auth_provider,
                role=resolved_role,
                status="active",
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
