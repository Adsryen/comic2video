import os
import tempfile

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-key")
os.environ.setdefault("SUPABASE_BUCKET_NAME", "test-bucket")
os.environ.setdefault("SUPABASE_BUCKET", "test-bucket")
os.environ.setdefault("RABBITMQ_URL", "memory://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("GROQ_API_KEY", "test-key")
_temp_dir = tempfile.mkdtemp(prefix="platform_model_config_")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{os.path.join(_temp_dir, 'test.db')}")
os.environ.setdefault("STORAGE_ROOT", os.path.join(_temp_dir, "storage"))
os.environ.setdefault("SCRIPT_PROVIDER", "groq")
os.environ.setdefault("SCRIPT_MODEL_NAME", "fallback-script-model")

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


def test_create_and_list_model_provider():
    create_response = client.post(
        "/api/v1/admin/model-providers",
        json={
            "provider_type": "script",
            "provider_key": "openai_compatible",
            "display_name": "Script Provider A",
            "base_url": "http://localhost:8001/v1",
            "model_name": "script-provider-model",
            "is_enabled": True,
            "is_default": True,
            "config_json": '{"temperature": 0.3}',
        },
    )

    assert create_response.status_code == 201
    payload = create_response.json()
    assert payload["provider_type"] == "script"
    assert payload["is_default"] is True

    list_response = client.get("/api/v1/admin/model-providers")
    assert list_response.status_code == 200
    providers = list_response.json()
    assert any(provider["display_name"] == "Script Provider A" for provider in providers)


def test_update_and_set_default_model_provider():
    provider_one = client.post(
        "/api/v1/admin/model-providers",
        json={
            "provider_type": "ocr",
            "provider_key": "tesseract",
            "display_name": "OCR Provider A",
            "is_enabled": True,
            "is_default": True,
        },
    ).json()
    provider_two = client.post(
        "/api/v1/admin/model-providers",
        json={
            "provider_type": "ocr",
            "provider_key": "paddleocr",
            "display_name": "OCR Provider B",
            "base_url": "http://localhost:8118",
            "is_enabled": True,
            "is_default": False,
        },
    ).json()

    update_response = client.patch(
        f"/api/v1/admin/model-providers/{provider_two['id']}",
        json={"display_name": "OCR Provider B"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["display_name"] == "OCR Provider B"

    default_response = client.post(f"/api/v1/admin/model-providers/{provider_two['id']}/set-default")
    assert default_response.status_code == 200
    assert default_response.json()["is_default"] is True

    providers = client.get("/api/v1/admin/model-providers").json()
    original = next(provider for provider in providers if provider["id"] == provider_one["id"])
    updated = next(provider for provider in providers if provider["id"] == provider_two["id"])
    assert original["is_default"] is False
    assert updated["is_default"] is True


def test_test_provider_returns_metadata_only_success_without_base_url():
    provider = client.post(
        "/api/v1/admin/model-providers",
        json={
            "provider_type": "tts",
            "provider_key": "edge_tts",
            "display_name": "TTS Provider A",
            "is_enabled": True,
            "is_default": True,
        },
    ).json()

    response = client.post(f"/api/v1/admin/model-providers/{provider['id']}/test")
    assert response.status_code == 200
    payload = response.json()
    assert payload["ok"] is True
    assert payload["provider_id"] == provider["id"]


def test_system_settings_endpoint_returns_list_shape():
    response = client.get("/api/v1/admin/system-settings")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_delete_model_provider_removes_record():
    provider = client.post(
        "/api/v1/admin/model-providers",
        json={
            "provider_type": "video",
            "provider_key": "video_local",
            "display_name": "Video Provider A",
            "is_enabled": True,
            "is_default": False,
        },
    ).json()

    delete_response = client.delete(f"/api/v1/admin/model-providers/{provider['id']}")
    assert delete_response.status_code == 204

    providers = client.get("/api/v1/admin/model-providers").json()
    assert all(item["id"] != provider["id"] for item in providers)


def test_delete_default_model_provider_is_rejected():
    provider = client.post(
        "/api/v1/admin/model-providers",
        json={
            "provider_type": "video",
            "provider_key": "video_local",
            "display_name": "Video Provider A",
            "is_enabled": True,
            "is_default": True,
        },
    ).json()

    delete_response = client.delete(f"/api/v1/admin/model-providers/{provider['id']}")
    assert delete_response.status_code == 400
    assert delete_response.json()["detail"] == "Cannot delete the default provider. Switch the default first."
