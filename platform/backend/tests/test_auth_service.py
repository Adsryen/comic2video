import os
import tempfile
from datetime import datetime, timedelta

os.environ.setdefault("AUTH_MODE", "enabled")
os.environ.setdefault("AUTH_JWT_SECRET", "test-secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "google-client-secret")
_temp_dir = tempfile.mkdtemp(prefix="platform_auth_service_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_temp_dir, 'test.db')}"

from app.db.base import Base
from app.db.models import RefreshToken, User, UserIdentity, UserSession
from app.db.session import SessionLocal, engine
from app.services.auth_service import AuthService
from app.services.user_service import UserService
from app.services.token_service import create_access_token, decode_access_token
from app.security.passwords import hash_password, verify_password


Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def _session():
    return SessionLocal()


def test_auth_env_defaults_are_available(monkeypatch):
    monkeypatch.setenv("AUTH_JWT_SECRET", "test-secret")
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "google-client-id")
    monkeypatch.setenv("GOOGLE_CLIENT_SECRET", "google-client-secret")

    from app import config

    assert config.AUTH_JWT_SECRET == "test-secret"
    assert config.GOOGLE_CLIENT_ID == "google-client-id"
    assert config.GOOGLE_CLIENT_SECRET == "google-client-secret"
    assert config.AUTH_ACCESS_TOKEN_EXPIRES_MINUTES > 0
    assert config.AUTH_REFRESH_TOKEN_EXPIRES_DAYS > 0


def test_auth_models_support_local_auth_fields():
    session = _session()
    try:
        user = User(
            email="user@example.com",
            password_hash="hashed-password",
            display_name="User",
            role="member",
            status="active",
        )
        session.add(user)
        session.commit()
        session.refresh(user)

        identity = UserIdentity(
            user_id=user.id,
            provider="local",
            provider_user_id=user.email,
            provider_email=user.email,
        )
        session_record = UserSession(
            user_id=user.id,
            session_token_hash="session-hash",
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        refresh = RefreshToken(
            user_id=user.id,
            token_hash="refresh-hash",
            expires_at=datetime.utcnow() + timedelta(days=14),
        )

        session.add_all([identity, session_record, refresh])
        session.commit()

        assert identity.provider == "local"
        assert session_record.user_id == user.id
        assert refresh.user_id == user.id
    finally:
        session.close()


def test_password_hash_round_trip():
    password = "S3curePass!"
    hashed = hash_password(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong-password", hashed) is False


def test_access_token_round_trip():
    token = create_access_token({"sub": "user-123", "role": "member"})
    payload = decode_access_token(token)
    assert payload["sub"] == "user-123"
    assert payload["role"] == "member"


def test_register_user_creates_local_identity():
    session = _session()
    try:
        auth = AuthService(session)
        result = auth.register_local_user(
            email="new@example.com",
            password="S3curePass!",
            display_name="New User",
        )

        assert result.user.email == "new@example.com"
        assert result.identity.provider == "local"
        assert result.session_token
        assert result.access_token
        assert result.refresh_token
    finally:
        session.close()


def test_login_user_returns_tokens():
    session = _session()
    try:
        AuthService(session).register_local_user(
            email="login@example.com",
            password="S3curePass!",
            display_name="Login User",
        )
        result = AuthService(session).login_local_user(email="login@example.com", password="S3curePass!")
        assert result.user.email == "login@example.com"
        assert result.access_token
        assert result.refresh_token
    finally:
        session.close()


def test_bootstrap_local_admin_creates_default_admin(monkeypatch):
    monkeypatch.setenv("LOCAL_ADMIN_ENABLED", "true")
    monkeypatch.setenv("LOCAL_ADMIN_USERNAME", "admin")
    monkeypatch.setenv("LOCAL_ADMIN_PASSWORD", "admin")
    monkeypatch.setenv("LOCAL_ADMIN_DISPLAY_NAME", "Administrator")

    from app.services.bootstrap_service import BootstrapService

    session = _session()
    try:
        BootstrapService.ensure_local_admin(session)
        admin_user = UserService.get_by_email(session, "admin@local")
        assert admin_user is not None
        assert admin_user.role == "admin"
        assert verify_password("admin", admin_user.password_hash) is True
    finally:
        session.close()
