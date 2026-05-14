import os
import tempfile

os.environ.setdefault("RABBITMQ_URL", "memory://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ.setdefault("AUTH_MODE", "enabled")
os.environ.setdefault("AUTH_JWT_SECRET", "test-secret")
os.environ.setdefault("GOOGLE_CLIENT_ID", "google-client-id")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "google-client-secret")
_temp_dir = tempfile.mkdtemp(prefix="platform_auth_api_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_temp_dir, 'test.db')}"
os.environ.setdefault("STORAGE_ROOT", os.path.join(_temp_dir, "storage"))



from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_register_login_and_me_flow():
    register = client.post(
        "/api/v1/auth/register",
        json={
            "email": "api@example.com",
            "password": "S3curePass!",
            "display_name": "API User",
        },
    )
    assert register.status_code == 201

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "api@example.com",
            "password": "S3curePass!",
        },
    )
    assert login.status_code == 200
    access_token = login.json()["access_token"]

    me = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me.status_code == 200
    assert me.json()["user"]["email"] == "api@example.com"


def test_users_requires_local_auth():
    login = client.post(
        "/api/v1/auth/register",
        json={
            "email": "admin@example.com",
            "password": "S3curePass!",
            "display_name": "Admin User",
        },
    )
    assert login.status_code == 201
    access_token = login.json()["access_token"]

    response = client.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {access_token}"})
    assert response.status_code in {200, 403}


def test_users_rejects_missing_auth():
    client.cookies.clear()
    response = client.get("/api/v1/admin/users")
    assert response.status_code == 401


def test_google_start_redirects_to_google():
    response = client.get("/api/v1/auth/google/start", follow_redirects=False)
    assert response.status_code in {302, 307}
    assert "accounts.google.com" in response.headers["location"]


def test_bootstrap_admin_login_works(monkeypatch):
    monkeypatch.setenv("LOCAL_ADMIN_ENABLED", "true")
    monkeypatch.setenv("LOCAL_ADMIN_USERNAME", "admin")
    monkeypatch.setenv("LOCAL_ADMIN_PASSWORD", "admin")
    monkeypatch.setenv("LOCAL_ADMIN_DISPLAY_NAME", "Administrator")

    login = client.post(
        "/api/v1/auth/login",
        json={
            "email": "admin@local",
            "password": "admin",
        },
    )
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "admin"
