from __future__ import annotations

import os

import requests
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db.session import SessionLocal
from app.services.user_service import UserService


SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BACKEND_AUTH_ENABLED = os.getenv("BACKEND_AUTH_ENABLED", "false").lower() in {"1", "true", "yes", "on"}

auth_scheme = HTTPBearer(auto_error=False)


def auth_is_enabled() -> bool:
    return BACKEND_AUTH_ENABLED and bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY)


def _fetch_supabase_user(access_token: str) -> dict:
    if not SUPABASE_URL or not SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(status_code=503, detail="Backend auth is not configured")

    response = requests.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "apikey": SUPABASE_PUBLISHABLE_KEY,
        },
        timeout=10,
    )
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")

    payload = response.json()
    if not isinstance(payload, dict) or not payload.get("id"):
        raise HTTPException(status_code=401, detail="Invalid authentication user payload")
    return payload


def require_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)) -> dict:
    if not auth_is_enabled():
        return {
            "id": "local-dev-user",
            "email": "local@example.com",
            "role": "local-dev",
            "auth_bypassed": True,
            "local_user_id": None,
        }

    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")

    auth_payload = _fetch_supabase_user(credentials.credentials)
    session = SessionLocal()
    try:
        local_user = UserService.upsert_from_auth_payload(session, auth_payload)
    finally:
        session.close()

    return {
        **auth_payload,
        "local_user_id": local_user.id,
        "local_user_role": local_user.role,
    }


def get_current_user_optional(credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme)) -> dict | None:
    if not auth_is_enabled():
        return None
    if credentials is None or not credentials.credentials:
        return None
    return _fetch_supabase_user(credentials.credentials)
