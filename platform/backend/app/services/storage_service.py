from __future__ import annotations

from app.adapters.storage_adapter import LocalStorageAdapter
import os

from app.config import STORAGE_PROVIDER, STORAGE_ROOT


class StorageService:
    def __init__(self, adapter=None, storage_root: str | None = None):
        if adapter is not None:
            self.adapter = adapter
        elif os.getenv("STORAGE_PROVIDER", STORAGE_PROVIDER) == "minio":
            from app.adapters.minio_storage import MinioStorageAdapter
            self.adapter = MinioStorageAdapter()
        else:
            self.adapter = LocalStorageAdapter(storage_root or os.getenv("STORAGE_ROOT", STORAGE_ROOT))

    def put_bytes(self, object_key: str, content: bytes, content_type: str | None = None) -> str:
        return self.adapter.put_bytes(object_key, content, content_type)

    def get_bytes(self, object_key: str) -> bytes:
        return self.adapter.get_bytes(object_key)

    def open_stream(self, object_key: str):
        return self.adapter.open_stream(object_key)

    def exists(self, object_key: str) -> bool:
        return self.adapter.exists(object_key)
