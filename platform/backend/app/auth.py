from __future__ import annotations

import os

from fastapi import Cookie, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import AUTH_MODE, AUTH_SESSION_COOKIE_NAME
from app.db.session import SessionLocal
from app.services.auth_service import AuthService
from app.services.session_service import SessionService
from app.services.token_service import hash_token
from app.services.user_service import UserService


auth_scheme = HTTPBearer(auto_error=False)


def auth_is_enabled() -> bool:
    mode = os.getenv('AUTH_MODE', AUTH_MODE)
    return mode.lower() in {'enabled', 'true', '1', 'yes', 'on'}


def _normalize_local_user(local_user) -> dict:
    return {
        'id': local_user.id,
        'email': local_user.email,
        'role': local_user.role,
        'status': local_user.status,
        'local_user_id': local_user.id,
        'local_user_role': local_user.role,
        'auth_bypassed': False,
    }


def require_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
    session_cookie: str | None = Cookie(default=None, alias=AUTH_SESSION_COOKIE_NAME),
) -> dict:
    if not auth_is_enabled():
        return {
            'id': 'local-dev-user',
            'email': 'local@example.com',
            'role': 'local-dev',
            'auth_bypassed': True,
            'local_user_id': None,
        }

    session = SessionLocal()
    try:
        if session_cookie:
            record = SessionService(session).get_valid_session(hash_token(session_cookie))
            if record is not None:
                local_user = UserService.get_by_id(session, record.user_id)
                if local_user is not None:
                    return _normalize_local_user(local_user)

        if credentials is None or not credentials.credentials:
            raise HTTPException(status_code=401, detail='Missing authentication')

        try:
            local_user = AuthService(session).resolve_user_from_access_token(credentials.credentials)
            return _normalize_local_user(local_user)
        except ValueError as exc:
            raise HTTPException(status_code=401, detail='Invalid access token') from exc
    finally:
        session.close()


def get_current_user_optional(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)) -> dict | None:
    if not auth_is_enabled():
        return None
    if credentials is None or not credentials.credentials:
        return None

    session = SessionLocal()
    try:
        local_user = AuthService(session).resolve_user_from_access_token(credentials.credentials)
        return _normalize_local_user(local_user)
    except (HTTPException, ValueError):
        return None
    finally:
        session.close()
