from __future__ import annotations

import hashlib
import secrets
from datetime import timedelta

from app.config import AUTH_ACCESS_TOKEN_EXPIRES_MINUTES, AUTH_REFRESH_TOKEN_EXPIRES_DAYS
from app.security.jwt import decode_token, encode_token


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(payload: dict) -> str:
    return encode_token(payload, timedelta(minutes=AUTH_ACCESS_TOKEN_EXPIRES_MINUTES))


def decode_access_token(token: str) -> dict:
    return decode_token(token)


def create_refresh_token(payload: dict) -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    token = encode_token({**payload, "type": "refresh", "jti": raw}, timedelta(days=AUTH_REFRESH_TOKEN_EXPIRES_DAYS))
    return token, hash_token(token)


def create_session_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(48)
    return raw, hash_token(raw)
