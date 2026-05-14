from __future__ import annotations

from io import BytesIO

from app.config import (
    MINIO_ACCESS_KEY,
    MINIO_BUCKET,
    MINIO_ENDPOINT,
    MINIO_REGION,
    MINIO_SECRET_KEY,
    MINIO_SECURE,
)
from app.adapters.storage_adapter import StorageAdapter


class MinioStorageAdapter(StorageAdapter):
    def __init__(self):
        import boto3
        from botocore.client import Config

        self.bucket = MINIO_BUCKET
        self.client = boto3.client(
            "s3",
            endpoint_url=MINIO_ENDPOINT,
            aws_access_key_id=MINIO_ACCESS_KEY,
            aws_secret_access_key=MINIO_SECRET_KEY,
            region_name=MINIO_REGION,
            use_ssl=MINIO_SECURE,
            config=Config(signature_version="s3v4"),
        )

    def put_bytes(self, object_key: str, content: bytes, content_type: str | None = None) -> str:
        extra = {}
        if content_type:
            extra["ContentType"] = content_type
        self.client.put_object(Bucket=self.bucket, Key=object_key, Body=content, **extra)
        return object_key

    def get_bytes(self, object_key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=object_key)
        return response["Body"].read()

    def open_stream(self, object_key: str):
        return BytesIO(self.get_bytes(object_key))

    def exists(self, object_key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except Exception:
            return False
