from __future__ import annotations

from dataclasses import dataclass

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import User, UserIdentity
from app.security.passwords import verify_password
from app.services.session_service import SessionService
from app.services.token_service import (
    create_access_token,
    create_refresh_token,
    create_session_token,
    decode_access_token,
    hash_token,
)
from app.services.user_service import UserService


@dataclass
class AuthResult:
    user: User
    identity: UserIdentity | None
    session_token: str
    access_token: str
    refresh_token: str


class AuthService:
    def __init__(self, session: Session):
        self.session = session
        self.sessions = SessionService(session)

    def register_local_user(self, *, email: str, password: str, display_name: str | None, ip: str | None = None, user_agent: str | None = None) -> AuthResult:
        if UserService.get_by_email(self.session, email):
            raise HTTPException(status_code=400, detail="Email already registered")

        user, identity = UserService.create_local_user(
            self.session,
            email=email,
            password=password,
            display_name=display_name,
        )
        return self._create_login_result(user=user, identity=identity, ip=ip, user_agent=user_agent)

    def login_local_user(self, *, email: str, password: str, ip: str | None = None, user_agent: str | None = None) -> AuthResult:
        user = UserService.get_by_email(self.session, email)
        if user is None or not user.password_hash or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        if user.status != "active":
            raise HTTPException(status_code=403, detail="User is not active")

        identity = UserService.get_identity(self.session, "local", user.email or "")
        return self._create_login_result(user=user, identity=identity, ip=ip, user_agent=user_agent)

    def refresh(self, *, refresh_token: str) -> tuple[str, str]:
        token_hash = hash_token(refresh_token)
        record = self.session.query(__import__('app.db.models', fromlist=['RefreshToken']).RefreshToken).filter_by(token_hash=token_hash).first()
        if record is None or record.revoked_at is not None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

        user = UserService.get_by_id(self.session, record.user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")

        access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
        new_refresh_token, new_refresh_hash = create_refresh_token({"sub": user.id, "role": user.role})
        record.revoked_at = __import__('datetime').datetime.utcnow()
        self.session.add(record)
        self.session.commit()
        self.sessions.create_refresh_token(user_id=user.id, token_hash=new_refresh_hash)
        return access_token, new_refresh_token

    def resolve_user_from_access_token(self, token: str) -> User:
        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid access token")
        user = UserService.get_by_id(self.session, user_id)
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    def _create_login_result(self, *, user: User, identity: UserIdentity | None, ip: str | None, user_agent: str | None) -> AuthResult:
        user = UserService.touch_last_login(self.session, user)
        session_token, session_hash = create_session_token()
        access_token = create_access_token({"sub": user.id, "role": user.role, "email": user.email})
        refresh_token, refresh_hash = create_refresh_token({"sub": user.id, "role": user.role, "email": user.email})
        self.sessions.create_user_session(user_id=user.id, session_token_hash=session_hash, ip=ip, user_agent=user_agent)
        self.sessions.create_refresh_token(user_id=user.id, token_hash=refresh_hash)
        return AuthResult(
            user=user,
            identity=identity,
            session_token=session_token,
            access_token=access_token,
            refresh_token=refresh_token,
        )
