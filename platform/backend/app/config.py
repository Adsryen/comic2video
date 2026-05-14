import os
import platform
from types import ModuleType
from dotenv import load_dotenv

load_dotenv()

SYSTEM_OS = platform.system()

if SYSTEM_OS == "Windows":
    BASE_DIR = os.getcwd()
    print(f"💻 Running Locally (Windows): Using {BASE_DIR} for storage")
else:
    BASE_DIR = "/tmp"
    print(f"🚀 Running on Server (Linux): Using {BASE_DIR} for storage")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _get(name: str):
    values = {
        "TTS_CACHE_DIR": os.path.join(BASE_DIR, "tts_cache"),
        "TEMP_DIR": os.path.join(BASE_DIR, "temp"),
        "DATABASE_URL": os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'comic_video.db')}") ,
        "AUTH_MODE": os.getenv("AUTH_MODE", "enabled"),
        "AUTH_JWT_SECRET": os.getenv("AUTH_JWT_SECRET", ""),
        "AUTH_ACCESS_TOKEN_EXPIRES_MINUTES": int(os.getenv("AUTH_ACCESS_TOKEN_EXPIRES_MINUTES", "30")),
        "AUTH_REFRESH_TOKEN_EXPIRES_DAYS": int(os.getenv("AUTH_REFRESH_TOKEN_EXPIRES_DAYS", "14")),
        "AUTH_SESSION_COOKIE_NAME": os.getenv("AUTH_SESSION_COOKIE_NAME", "platform_session"),
        "AUTH_SESSION_COOKIE_SECURE": _as_bool(os.getenv("AUTH_SESSION_COOKIE_SECURE", "false")),
        "AUTH_SESSION_COOKIE_DOMAIN": os.getenv("AUTH_SESSION_COOKIE_DOMAIN", ""),
        "FRONTEND_BASE_URL": os.getenv("FRONTEND_BASE_URL", "http://localhost:5173"),
        "GOOGLE_CLIENT_ID": os.getenv("GOOGLE_CLIENT_ID", ""),
        "GOOGLE_CLIENT_SECRET": os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "GOOGLE_REDIRECT_URI": os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/v1/auth/google/callback"),
        "STORAGE_PROVIDER": os.getenv("STORAGE_PROVIDER", "local"),
        "MINIO_ENDPOINT": os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:29000"),
        "MINIO_ACCESS_KEY": os.getenv("MINIO_ACCESS_KEY", "comic2video_minio"),
        "MINIO_SECRET_KEY": os.getenv("MINIO_SECRET_KEY", "comic2video_minio_secret"),
        "MINIO_BUCKET": os.getenv("MINIO_BUCKET", "comic2video"),
        "MINIO_REGION": os.getenv("MINIO_REGION", "us-east-1"),
        "MINIO_SECURE": _as_bool(os.getenv("MINIO_SECURE", "false")),
        "STORAGE_ROOT": os.getenv("STORAGE_ROOT", os.path.join(BASE_DIR, "storage")),
        "GOOGLE_API_KEY": os.getenv("GROQ_API_KEY") or os.getenv("GOOGLE_API_KEY"),
    }
    if name in values:
        return values[name]
    raise AttributeError(name)


def ensure_runtime_dirs() -> None:
    os.makedirs(_get("TTS_CACHE_DIR"), exist_ok=True)
    os.makedirs(_get("TEMP_DIR"), exist_ok=True)
    os.makedirs(_get("STORAGE_ROOT"), exist_ok=True)


ensure_runtime_dirs()

if not _get("GOOGLE_API_KEY"):
    print("⚠️ WARNING: GOOGLE_API_KEY/GROQ_API_KEY is missing.")


class _ConfigModule(ModuleType):
    def __getattribute__(self, name: str):
        dynamic_names = {
            "TTS_CACHE_DIR",
            "TEMP_DIR",
            "DATABASE_URL",
            "AUTH_MODE",
            "AUTH_JWT_SECRET",
            "AUTH_ACCESS_TOKEN_EXPIRES_MINUTES",
            "AUTH_REFRESH_TOKEN_EXPIRES_DAYS",
            "AUTH_SESSION_COOKIE_NAME",
            "AUTH_SESSION_COOKIE_SECURE",
            "AUTH_SESSION_COOKIE_DOMAIN",
            "FRONTEND_BASE_URL",
            "GOOGLE_CLIENT_ID",
            "GOOGLE_CLIENT_SECRET",
            "GOOGLE_REDIRECT_URI",
            "STORAGE_PROVIDER",
            "MINIO_ENDPOINT",
            "MINIO_ACCESS_KEY",
            "MINIO_SECRET_KEY",
            "MINIO_BUCKET",
            "MINIO_REGION",
            "MINIO_SECURE",
            "STORAGE_ROOT",
            "GOOGLE_API_KEY",
        }
        if name in dynamic_names:
            return _get(name)
        return super().__getattribute__(name)


import sys
sys.modules[__name__].__class__ = _ConfigModule
