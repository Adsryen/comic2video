import os
import tempfile

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("SUPABASE_BUCKET_NAME", "test-bucket")
os.environ.setdefault("SUPABASE_BUCKET", "test-bucket")
os.environ.setdefault("RABBITMQ_URL", "memory://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GROQ_API_KEY", "test-key")
_temp_dir = tempfile.mkdtemp(prefix="platform_jobs_")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(_temp_dir, 'test.db')}")
os.environ.setdefault("STORAGE_ROOT", os.path.join(_temp_dir, "storage"))

import supabase


class _DummyStorageBucket:
    def upload(self, *args, **kwargs):
        return {"ok": True}

    def get_public_url(self, path):
        return f"https://example.supabase.co/storage/v1/object/public/test-bucket/{path}"


class _DummyStorage:
    def from_(self, *args, **kwargs):
        return _DummyStorageBucket()


class _DummyTableQuery:
    data = []

    def insert(self, *args, **kwargs):
        return self

    def update(self, *args, **kwargs):
        return self

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        return self


class _DummySupabaseClient:
    storage = _DummyStorage()

    def table(self, *args, **kwargs):
        return _DummyTableQuery()


supabase.create_client = lambda *args, **kwargs: _DummySupabaseClient()

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _create_project():
    response = client.post(
        "/api/v1/projects",
        data={"name": "Attack on Titan"},
        files={"source_file": ("chapter.pdf", b"fake-pdf", "application/pdf")},
    )
    return response.json()["id"]


def test_create_job_runs_pipeline_and_returns_completed_job():
    project_id = _create_project()
    response = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["project_id"] == project_id
    assert data["status"] == "COMPLETED"
    assert data["mode"] == "basic"
    assert data["progress"] == 100


def test_job_steps_complete_after_pipeline_scaffold_runs():
    project_id = _create_project()
    job_response = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    )
    job_id = job_response.json()["id"]

    steps_response = client.get(f"/api/v1/jobs/{job_id}/steps")
    assert steps_response.status_code == 200
    steps = steps_response.json()
    assert len(steps) == 7
    assert all(step["status"] == "COMPLETED" for step in steps)


def test_health_endpoint_returns_ok():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_models_endpoint_returns_backend_availability_shape():
    response = client.get("/api/v1/models")
    assert response.status_code == 200
    payload = response.json()
    assert set(payload.keys()) == {"ocr", "vision", "tts", "video"}


def test_get_job_result_returns_final_video_mp4():
    project_id = _create_project()
    job = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    response = client.get(f"/api/v1/jobs/{job['id']}/result")
    assert response.status_code == 200
    payload = response.json()
    assert "video_url" in payload
    assert payload["video_url"] is not None
    assert payload["storage_path"].endswith(".mp4")


def test_get_job_storyboard_returns_generated_structure():
    project_id = _create_project()
    job = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    response = client.get(f"/api/v1/jobs/{job['id']}/storyboard")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload["scenes"]) >= 1
    assert payload["scenes"][0]["video_mode"] == "basic"


def test_create_job_creates_storyboard_and_result_assets():
    project_id = _create_project()
    job = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    assets_response = client.get(f"/api/v1/projects/{project_id}/assets")
    assert assets_response.status_code == 200
    assets = assets_response.json()
    asset_types = {asset["asset_type"] for asset in assets}
    assert "storyboard" in asset_types
    assert "final_video" in asset_types

    final_video_asset = next(asset for asset in assets if asset["asset_type"] == "final_video")
    assert final_video_asset["storage_path"].endswith(".mp4")
    assert final_video_asset["mime_type"] == "video/mp4"
    assert any(asset["asset_type"] == "narration_audio" for asset in assets)

    result_response = client.get(f"/api/v1/jobs/{job['id']}/result")
    result = result_response.json()
    assert result["video_url"] is not None


def test_completed_job_steps_are_all_completed_after_pipeline_run():
    project_id = _create_project()
    job = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    steps = client.get(f"/api/v1/jobs/{job['id']}/steps").json()
    assert all(step["status"] == "COMPLETED" for step in steps)


def test_get_job_assets_returns_generated_artifacts():
    project_id = _create_project()
    job = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    response = client.get(f"/api/v1/jobs/{job['id']}/assets")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 1
    assert all(asset["job_id"] == job["id"] for asset in payload)


def test_storage_endpoint_serves_job_asset_file():
    project_id = _create_project()
    job = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    assets = client.get(f"/api/v1/jobs/{job['id']}/assets").json()
    storyboard_asset = next(asset for asset in assets if asset["asset_type"] == "storyboard")

    response = client.get(f"/api/v1/storage/{storyboard_asset['id']}")
    assert response.status_code == 200
    assert response.content
