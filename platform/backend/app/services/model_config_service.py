from __future__ import annotations

import os
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.db.models import ModelProvider, SystemSetting


DEFAULT_PROVIDER_FALLBACKS = {
    "ocr": {
        "provider_key": os.getenv("OCR_PROVIDER", "tesseract"),
        "display_name": os.getenv("OCR_PROVIDER", "tesseract"),
        "base_url": os.getenv("OCR_API_BASE"),
        "model_name": os.getenv("OCR_MODEL_NAME"),
        "source": "env",
        "config_json": os.getenv("OCR_CONFIG_JSON"),
    },
    "script": {
        "provider_key": os.getenv("SCRIPT_PROVIDER", "groq"),
        "display_name": os.getenv("SCRIPT_PROVIDER", "groq"),
        "base_url": os.getenv("SCRIPT_API_BASE"),
        "model_name": os.getenv("SCRIPT_MODEL_NAME") or "script-default",
        "source": "env",
        "config_json": os.getenv("SCRIPT_CONFIG_JSON"),
    },
    "tts": {
        "provider_key": os.getenv("TTS_PROVIDER", "tts_local"),
        "display_name": os.getenv("TTS_PROVIDER", "tts_local"),
        "base_url": os.getenv("TTS_API_BASE"),
        "model_name": os.getenv("TTS_MODEL_NAME") or "tts-local",
        "source": "env",
        "config_json": os.getenv("TTS_CONFIG_JSON"),
    },
    "video": {
        "provider_key": os.getenv("VIDEO_PROVIDER", "opencv_slideshow"),
        "display_name": os.getenv("VIDEO_PROVIDER", "opencv_slideshow"),
        "base_url": os.getenv("VIDEO_API_BASE"),
        "model_name": os.getenv("VIDEO_MODEL_NAME") or "opencv_slideshow",
        "source": "env",
        "config_json": os.getenv("VIDEO_CONFIG_JSON"),
    },
}


class ModelConfigService:
    @staticmethod
    def list_providers(session: Session) -> list[ModelProvider]:
        return (
            session.query(ModelProvider)
            .order_by(ModelProvider.provider_type.asc(), ModelProvider.created_at.asc())
            .all()
        )

    @staticmethod
    def create_provider(session: Session, **kwargs: Any) -> ModelProvider:
        if kwargs.get("is_default"):
            ModelConfigService.clear_default(session, kwargs["provider_type"])

        provider = ModelProvider(**kwargs)
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

    @staticmethod
    def get_provider(session: Session, provider_id: str) -> ModelProvider | None:
        return session.query(ModelProvider).filter(ModelProvider.id == provider_id).first()

    @staticmethod
    def update_provider(session: Session, provider: ModelProvider, **kwargs: Any) -> ModelProvider:
        if kwargs.get("is_default"):
            ModelConfigService.clear_default(session, provider.provider_type)

        for key, value in kwargs.items():
            setattr(provider, key, value)

        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

    @staticmethod
    def clear_default(session: Session, provider_type: str) -> None:
        providers = session.query(ModelProvider).filter(ModelProvider.provider_type == provider_type).all()
        for provider in providers:
            provider.is_default = False
            session.add(provider)
        session.flush()

    @staticmethod
    def set_default(session: Session, provider: ModelProvider) -> ModelProvider:
        ModelConfigService.clear_default(session, provider.provider_type)
        provider.is_default = True
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

    @staticmethod
    def delete_provider(session: Session, provider: ModelProvider) -> None:
        session.delete(provider)
        session.commit()

    @staticmethod
    def list_system_settings(session: Session) -> list[SystemSetting]:
        return session.query(SystemSetting).order_by(SystemSetting.setting_key.asc()).all()

    @staticmethod
    def resolve_active_provider(session: Session, provider_type: str) -> dict[str, Any]:
        provider = (
            session.query(ModelProvider)
            .filter(
                ModelProvider.provider_type == provider_type,
                ModelProvider.is_enabled.is_(True),
                ModelProvider.is_default.is_(True),
            )
            .first()
        )
        if provider:
            return {
                "id": provider.id,
                "provider_key": provider.provider_key,
                "display_name": provider.display_name,
                "base_url": provider.base_url,
                "model_name": provider.model_name,
                "config_json": provider.config_json,
                "source": "database",
            }

        return DEFAULT_PROVIDER_FALLBACKS.get(provider_type, {"source": "legacy"})

    @staticmethod
    def test_provider_connectivity(provider: ModelProvider) -> tuple[bool, str]:
        if not provider.base_url:
            return True, "No base_url configured; saved as metadata-only provider"

        candidate_urls = [provider.base_url.rstrip("/")]
        if provider.provider_type == "script":
            candidate_urls.append(f"{provider.base_url.rstrip('/')}/models")
            candidate_urls.append(f"{provider.base_url.rstrip('/')}/health")
        else:
            candidate_urls.append(f"{provider.base_url.rstrip('/')}/health")

        for url in candidate_urls:
            try:
                response = requests.get(url, timeout=5)
                if response.ok:
                    return True, f"Reachable: {url}"
            except requests.RequestException:
                continue

        return False, f"Unable to reach provider at {provider.base_url}"
