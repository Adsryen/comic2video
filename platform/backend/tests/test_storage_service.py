import os
import tempfile

os.environ["AUTH_MODE"] = "enabled"
os.environ.setdefault("AUTH_JWT_SECRET", "test-secret")
os.environ["STORAGE_PROVIDER"] = "minio"
os.environ.setdefault("MINIO_ENDPOINT", "http://127.0.0.1:29000")
os.environ.setdefault("MINIO_BUCKET", "comic2video")
_temp_dir = tempfile.mkdtemp(prefix="platform_storage_service_")
os.environ["DATABASE_URL"] = f"sqlite:///{os.path.join(_temp_dir, 'test.db')}"

from app.adapters.storage_adapter import LocalStorageAdapter
from app.services.storage_service import StorageService


class FakeStorageAdapter:
    def __init__(self):
        self.objects = {}

    def put_bytes(self, object_key: str, content: bytes, content_type: str | None = None) -> str:
        self.objects[object_key] = content
        return object_key

    def get_bytes(self, object_key: str) -> bytes:
        return self.objects[object_key]

    def open_stream(self, object_key: str):
        from io import BytesIO
        return BytesIO(self.objects[object_key])

    def exists(self, object_key: str) -> bool:
        return object_key in self.objects


def test_storage_env_defaults_are_available(monkeypatch):
    monkeypatch.setenv("STORAGE_PROVIDER", "minio")
    monkeypatch.setenv("MINIO_ENDPOINT", "http://127.0.0.1:29000")
    monkeypatch.setenv("MINIO_BUCKET", "comic2video")

    from app import config

    assert config.STORAGE_PROVIDER == "minio"
    assert config.MINIO_ENDPOINT == "http://127.0.0.1:29000"
    assert config.MINIO_BUCKET == "comic2video"


def test_storage_service_put_bytes_returns_object_key():
    service = StorageService(adapter=FakeStorageAdapter())
    key = service.put_bytes(
        object_key="jobs/job-1/video/output.mp4",
        content=b"video-bytes",
        content_type="video/mp4",
    )
    assert key == "jobs/job-1/video/output.mp4"


def test_storage_service_open_stream_returns_uploaded_bytes():
    service = StorageService(adapter=FakeStorageAdapter())
    service.put_bytes(
        object_key="jobs/job-1/result.json",
        content=b"{}",
        content_type="application/json",
    )
    payload = service.get_bytes("jobs/job-1/result.json")
    assert payload == b"{}"


def test_local_storage_adapter_returns_object_key():
    tmp_dir = tempfile.mkdtemp(prefix="platform_local_storage_")
    adapter = LocalStorageAdapter(tmp_dir)
    key = adapter.put_bytes("projects/test/source.pdf", b"pdf-bytes", "application/pdf")
    assert key == "projects/test/source.pdf"
    assert adapter.exists(key) is True
