import os
import tempfile

import pytest

os.environ["AUTH_MODE"] = "enabled"
os.environ.setdefault("AUTH_JWT_SECRET", "test-secret")
os.environ["STORAGE_PROVIDER"] = "local"
os.environ.setdefault("RABBITMQ_URL", "memory://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GROQ_API_KEY", "test-key")
_temp_dir = tempfile.mkdtemp(prefix="platform_assets_storage_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_temp_dir, 'test.db')}"
os.environ["STORAGE_ROOT"] = os.path.join(_temp_dir, "storage")

from fastapi.testclient import TestClient

from app.db.models import Asset, Project
from app.db.session import SessionLocal
from app.main import app
from app.services.storage_service import StorageService

client = TestClient(app)


@pytest.fixture(autouse=True)
def _configure_env():
    os.environ["AUTH_MODE"] = "enabled"
    os.environ["STORAGE_PROVIDER"] = "local"
    os.environ["STORAGE_ROOT"] = os.path.join(_temp_dir, "storage")


def _seed_asset(created_by_user_id: str):
    session = SessionLocal()
    try:
        project = Project(name="Storage Project", source_type="pdf", status="UPLOADED", created_by_user_id=created_by_user_id)
        session.add(project)
        session.commit()
        session.refresh(project)

        storage = StorageService(storage_root=os.environ["STORAGE_ROOT"])
        storage.put_bytes("jobs/job-1/artifacts/result.json", b'{"ok": true}', "application/json")

        asset = Asset(
            project_id=project.id,
            asset_type="result_json",
            storage_path="jobs/job-1/artifacts/result.json",
            mime_type="application/json",
        )
        session.add(asset)
        session.commit()
        session.refresh(asset)
        return asset.id
    finally:
        session.close()


def test_get_asset_file_streams_storage_object():
    client.cookies.clear()
    register = client.post(
        "/api/v1/auth/register",
        json={"email": "asset-reader@example.com", "password": "S3curePass!", "display_name": "Asset Reader"},
    )
    assert register.status_code == 201

    user_id = register.json()["user"]["id"]
    asset_id = _seed_asset(user_id)
    response = client.get(f"/api/v1/storage/{asset_id}")
    assert response.status_code == 200
    assert response.content == b'{"ok": true}'
    assert response.headers["content-type"].startswith("application/json")
