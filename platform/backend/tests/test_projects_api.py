import os
import tempfile
import uuid

import pytest

os.environ.setdefault("RABBITMQ_URL", "memory://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GROQ_API_KEY", "test-key")
os.environ["AUTH_MODE"] = "disabled"
os.environ["STORAGE_PROVIDER"] = "local"
_temp_dir = tempfile.mkdtemp(prefix="platform_projects_")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(_temp_dir, 'test.db')}")
os.environ.setdefault("STORAGE_ROOT", os.path.join(_temp_dir, "storage"))



from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def _configure_env():
    os.environ["AUTH_MODE"] = "disabled"
    os.environ["STORAGE_PROVIDER"] = "local"
    os.environ["STORAGE_ROOT"] = os.path.join(_temp_dir, "storage")


def test_create_project_requires_database_backed_response(monkeypatch):
    response = client.post(
        "/api/v1/projects",
        data={"name": "One Piece"},
        files={"source_file": ("chapter1.pdf", b"fake-pdf", "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "One Piece"
    assert data["source_type"] == "pdf"
    assert data["status"] == "UPLOADED"
    assert "id" in data


def test_create_project_returns_uploaded_project():
    response = client.post(
        "/api/v1/projects",
        data={"name": f"Naruto-{uuid.uuid4()}"},
        files={"source_file": ("chapter01.cbz", b"fake-cbz", "application/x-cbz")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["source_type"] == "cbz"
    assert data["status"] == "UPLOADED"


def test_list_projects_returns_created_project():
    project_name = f"Bleach-{uuid.uuid4()}"
    create_response = client.post(
        "/api/v1/projects",
        data={"name": project_name},
        files={"source_file": ("chapter01.pdf", b"fake-pdf", "application/pdf")},
    )
    assert create_response.status_code == 201

    list_response = client.get("/api/v1/projects")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert any(project["name"] == project_name for project in payload)


def test_get_project_returns_created_project():
    create_response = client.post(
        "/api/v1/projects",
        data={"name": "Detail Project"},
        files={"source_file": ("chapter01.pdf", b"fake-pdf", "application/pdf")},
    )
    assert create_response.status_code == 201
    project = create_response.json()

    response = client.get(f"/api/v1/projects/{project['id']}")
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == project["id"]
    assert payload["name"] == "Detail Project"


def test_get_project_assets_returns_source_file_asset():
    create_response = client.post(
        "/api/v1/projects",
        data={"name": "Asset Project"},
        files={"source_file": ("chapter01.cbz", b"fake-cbz", "application/x-cbz")},
    )
    assert create_response.status_code == 201
    project = create_response.json()

    response = client.get(f"/api/v1/projects/{project['id']}/assets")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 1
    assert payload[0]["asset_type"] == "source_file"

def test_create_project_stores_object_key_not_absolute_path():
    response = client.post(
        "/api/v1/projects",
        data={"name": "Object Key Project"},
        files={"source_file": ("chapter01.pdf", b"fake-pdf", "application/pdf")},
    )
    assert response.status_code == 201
    project = response.json()

    assets = client.get(f"/api/v1/projects/{project['id']}/assets").json()
    source_asset = next(asset for asset in assets if asset["asset_type"] == "source_file")
    assert source_asset["storage_path"].startswith("projects/")


def test_get_project_jobs_returns_created_jobs():
    create_response = client.post(
        "/api/v1/projects",
        data={"name": "Project With Jobs"},
        files={"source_file": ("chapter01.pdf", b"fake-pdf", "application/pdf")},
    )
    assert create_response.status_code == 201
    project = create_response.json()

    job_response = client.post(
        f"/api/v1/projects/{project['id']}/jobs",
        json={
            "mode": "basic",
            "language": "zh",
            "voice": "default",
            "subtitle_enabled": True,
        },
    )
    assert job_response.status_code == 201

    response = client.get(f"/api/v1/projects/{project['id']}/jobs")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 1
    assert payload[0]["project_id"] == project["id"]
