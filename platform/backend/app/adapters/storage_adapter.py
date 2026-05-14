from __future__ import annotations

from abc import ABC, abstractmethod
from io import BytesIO
from pathlib import Path


class StorageAdapter(ABC):
    @abstractmethod
    def put_bytes(self, object_key: str, content: bytes, content_type: str | None = None) -> str:
        raise NotImplementedError

    @abstractmethod
    def get_bytes(self, object_key: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def open_stream(self, object_key: str):
        raise NotImplementedError

    @abstractmethod
    def exists(self, object_key: str) -> bool:
        raise NotImplementedError


class LocalStorageAdapter(StorageAdapter):
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, object_key: str) -> Path:
        return self.root_dir / object_key

    def put_bytes(self, object_key: str, content: bytes, content_type: str | None = None) -> str:
        destination = self._resolve(object_key)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return object_key

    def get_bytes(self, object_key: str) -> bytes:
        return self._resolve(object_key).read_bytes()

    def open_stream(self, object_key: str):
        return BytesIO(self.get_bytes(object_key))

    def exists(self, object_key: str) -> bool:
        destination = self._resolve(object_key)
        return destination.exists() and destination.is_file()
