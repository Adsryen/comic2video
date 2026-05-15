from __future__ import annotations

import os
import json
from datetime import datetime
from typing import Any

import requests
from sqlalchemy.orm import Session

from app.db.models import CapabilityModelMapping, ModelProvider, ModelVendor, SystemSetting


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
    VENDOR_MUTABLE_FIELDS = {
        "vendor_key",
        "display_name",
        "base_url",
        "auth_type",
        "api_key",
        "config_json",
        "is_enabled",
        "last_tested_at",
    }

    @staticmethod
    def _sanitize_vendor_kwargs(kwargs: dict[str, Any]) -> dict[str, Any]:
        return {key: value for key, value in kwargs.items() if key in ModelConfigService.VENDOR_MUTABLE_FIELDS}

    @staticmethod
    def _mapping_to_provider(mapping: CapabilityModelMapping, vendor: ModelVendor) -> ModelProvider:
        return ModelProvider(
            id=mapping.id,
            provider_type=mapping.capability_type,
            provider_key=vendor.vendor_key,
            display_name=mapping.display_name,
            base_url=vendor.base_url,
            model_name=mapping.model_name,
            is_enabled=mapping.is_enabled,
            is_default=mapping.is_default,
            auth_type=vendor.auth_type,
            api_key=vendor.api_key,
            config_json=mapping.config_json or vendor.config_json,
            last_tested_at=vendor.last_tested_at,
            created_at=mapping.created_at,
            updated_at=mapping.updated_at,
        )

    @staticmethod
    def _find_vendor(session: Session, provider_key: str, base_url: str | None) -> ModelVendor | None:
        query = session.query(ModelVendor).filter(ModelVendor.vendor_key == provider_key)
        if base_url:
            query = query.filter(ModelVendor.base_url == base_url)
        return query.order_by(ModelVendor.created_at.asc()).first()

    @staticmethod
    def mask_api_key(value: str | None) -> str | None:
        if not value:
            return None
        if len(value) <= 8:
            return '*' * len(value)
        return f"{value[:4]}{'*' * max(4, len(value) - 8)}{value[-4:]}"

    @staticmethod
    def list_providers(session: Session) -> list[ModelProvider]:
        mappings = (
            session.query(CapabilityModelMapping, ModelVendor)
            .join(ModelVendor, CapabilityModelMapping.vendor_id == ModelVendor.id)
            .order_by(CapabilityModelMapping.capability_type.asc(), CapabilityModelMapping.created_at.asc())
            .all()
        )

        if mappings:
            synthetic = []
            for mapping, vendor in mappings:
                synthetic.append(ModelConfigService._mapping_to_provider(mapping, vendor))
            return synthetic

        return (
            session.query(ModelProvider)
            .order_by(ModelProvider.provider_type.asc(), ModelProvider.created_at.asc())
            .all()
        )

    @staticmethod
    def create_provider(session: Session, **kwargs: Any) -> ModelProvider:
        vendor = ModelConfigService._find_vendor(session, kwargs["provider_key"], kwargs.get("base_url"))
        if not vendor:
            vendor = ModelVendor(
                vendor_key=kwargs["provider_key"],
                display_name=kwargs["provider_key"],
                base_url=kwargs.get("base_url"),
                auth_type=kwargs.get("auth_type"),
                api_key=kwargs.get("api_key"),
                config_json=kwargs.get("config_json"),
                is_enabled=True,
            )
            session.add(vendor)
            session.flush()
        else:
            vendor.base_url = kwargs.get("base_url")
            vendor.auth_type = kwargs.get("auth_type")
            vendor.api_key = kwargs.get("api_key")
            if kwargs.get("config_json"):
                vendor.config_json = kwargs.get("config_json")
            session.add(vendor)

        if kwargs.get("is_default"):
            ModelConfigService.clear_default(session, kwargs["provider_type"])

        mapping = CapabilityModelMapping(
            capability_type=kwargs["provider_type"],
            vendor_id=vendor.id,
            model_name=kwargs.get("model_name"),
            display_name=kwargs["display_name"],
            is_enabled=kwargs.get("is_enabled", True),
            is_default=kwargs.get("is_default", False),
            config_json=kwargs.get("config_json"),
        )
        session.add(mapping)
        session.commit()
        session.refresh(mapping)
        session.refresh(vendor)
        return ModelConfigService._mapping_to_provider(mapping, vendor)

    @staticmethod
    def get_provider(session: Session, provider_id: str) -> ModelProvider | None:
        mapping = (
            session.query(CapabilityModelMapping, ModelVendor)
            .join(ModelVendor, CapabilityModelMapping.vendor_id == ModelVendor.id)
            .filter(CapabilityModelMapping.id == provider_id)
            .first()
        )
        if mapping:
            capability_mapping, vendor = mapping
            return ModelConfigService._mapping_to_provider(capability_mapping, vendor)

        return session.query(ModelProvider).filter(ModelProvider.id == provider_id).first()

    @staticmethod
    def update_provider(session: Session, provider: ModelProvider, **kwargs: Any) -> ModelProvider:
        mapping = session.query(CapabilityModelMapping).filter(CapabilityModelMapping.id == provider.id).first()
        if mapping:
            vendor = session.query(ModelVendor).filter(ModelVendor.id == mapping.vendor_id).first()
            if kwargs.get("is_default"):
                ModelConfigService.clear_default(session, mapping.capability_type)

            if "display_name" in kwargs:
                mapping.display_name = kwargs["display_name"]
            if "model_name" in kwargs:
                mapping.model_name = kwargs["model_name"]
            if "is_enabled" in kwargs:
                mapping.is_enabled = kwargs["is_enabled"]
            if "is_default" in kwargs:
                mapping.is_default = kwargs["is_default"]
            if "config_json" in kwargs:
                mapping.config_json = kwargs["config_json"]
            if "provider_type" in kwargs:
                mapping.capability_type = kwargs["provider_type"]

            if vendor:
                if "provider_key" in kwargs:
                    vendor.vendor_key = kwargs["provider_key"]
                if "base_url" in kwargs:
                    vendor.base_url = kwargs["base_url"]
                if "auth_type" in kwargs:
                    vendor.auth_type = kwargs["auth_type"]
                if "api_key" in kwargs:
                    vendor.api_key = kwargs["api_key"]
                session.add(vendor)

            session.add(mapping)
            session.commit()
            session.refresh(mapping)
            if vendor:
                session.refresh(vendor)
                return ModelConfigService._mapping_to_provider(mapping, vendor)

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
        mappings = session.query(CapabilityModelMapping).filter(CapabilityModelMapping.capability_type == provider_type).all()
        if mappings:
            for mapping in mappings:
                mapping.is_default = False
                session.add(mapping)
            session.flush()
            return

        providers = session.query(ModelProvider).filter(ModelProvider.provider_type == provider_type).all()
        for provider in providers:
            provider.is_default = False
            session.add(provider)
        session.flush()

    @staticmethod
    def set_default(session: Session, provider: ModelProvider) -> ModelProvider:
        mapping = session.query(CapabilityModelMapping).filter(CapabilityModelMapping.id == provider.id).first()
        if mapping:
            ModelConfigService.clear_default(session, mapping.capability_type)
            mapping.is_default = True
            session.add(mapping)
            session.commit()
            session.refresh(mapping)
            vendor = session.query(ModelVendor).filter(ModelVendor.id == mapping.vendor_id).first()
            return ModelConfigService._mapping_to_provider(mapping, vendor)

        ModelConfigService.clear_default(session, provider.provider_type)
        provider.is_default = True
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

    @staticmethod
    def delete_provider(session: Session, provider: ModelProvider) -> None:
        mapping = session.query(CapabilityModelMapping).filter(CapabilityModelMapping.id == provider.id).first()
        if mapping:
            session.delete(mapping)
            session.commit()
            return

        session.delete(provider)
        session.commit()

    @staticmethod
    def list_system_settings(session: Session) -> list[SystemSetting]:
        return session.query(SystemSetting).order_by(SystemSetting.setting_key.asc()).all()

    @staticmethod
    def resolve_active_provider(session: Session, provider_type: str) -> dict[str, Any]:
        mapping = (
            session.query(CapabilityModelMapping, ModelVendor)
            .join(ModelVendor, CapabilityModelMapping.vendor_id == ModelVendor.id)
            .filter(
                CapabilityModelMapping.capability_type == provider_type,
                CapabilityModelMapping.is_enabled.is_(True),
                CapabilityModelMapping.is_default.is_(True),
                ModelVendor.is_enabled.is_(True),
            )
            .first()
        )
        if mapping:
            capability_mapping, vendor = mapping
            return {
                "id": capability_mapping.id,
                "provider_key": vendor.vendor_key,
                "display_name": capability_mapping.display_name,
                "base_url": vendor.base_url,
                "model_name": capability_mapping.model_name,
                "auth_type": vendor.auth_type,
                "api_key": vendor.api_key,
                "config_json": capability_mapping.config_json or vendor.config_json,
                "source": "vendor-mapping",
                "last_tested_at": vendor.last_tested_at,
            }

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

    @staticmethod
    def mark_provider_tested(session: Session, provider: ModelProvider) -> ModelProvider:
        mapping = session.query(CapabilityModelMapping).filter(CapabilityModelMapping.id == provider.id).first()
        if mapping:
            vendor = session.query(ModelVendor).filter(ModelVendor.id == mapping.vendor_id).first()
            if vendor:
                vendor.last_tested_at = datetime.utcnow()
                session.add(vendor)
                session.commit()
                session.refresh(vendor)
                session.refresh(mapping)
                return ModelConfigService._mapping_to_provider(mapping, vendor)

        provider.last_tested_at = datetime.utcnow()
        session.add(provider)
        session.commit()
        session.refresh(provider)
        return provider

    @staticmethod
    def discover_models(provider_key: str, base_url: str | None, api_key: str | None, config_json: str | None) -> tuple[bool, list[str], str | None]:
        if not base_url:
            return False, [], "Missing API endpoint"

        parsed_config = {}
        if config_json:
            try:
                parsed_config = json.loads(config_json)
            except json.JSONDecodeError:
                return False, [], "Invalid config_json"

        api_key = api_key or parsed_config.get("api_key")
        headers = {}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"

        candidate_url = f"{base_url.rstrip('/')}/models"

        try:
            response = requests.get(candidate_url, headers=headers, timeout=8)
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            return False, [], str(exc)
        except ValueError:
            return False, [], "Provider did not return valid JSON"

        items = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(items, list):
            return False, [], "Provider response does not contain a model list"

        models = [item.get("id") for item in items if isinstance(item, dict) and item.get("id")]
        return True, models, None if models else "No models returned"

    @staticmethod
    def test_vendor(session: Session, vendor: ModelVendor) -> tuple[bool, list[str], str | None, ModelVendor]:
        ok, models, detail = ModelConfigService.discover_models(
            vendor.vendor_key,
            vendor.base_url,
            vendor.api_key,
            vendor.config_json,
        )

        vendor.last_tested_at = datetime.utcnow()
        vendor.last_test_status = "success" if ok else "failed"
        vendor.last_test_message = detail or (f"Discovered {len(models)} models" if ok else "Model discovery failed")
        vendor.discovered_models_json = json.dumps(models, ensure_ascii=False)
        vendor.discovered_models_at = datetime.utcnow()
        session.add(vendor)
        session.commit()
        session.refresh(vendor)
        return ok, models, detail, vendor

    @staticmethod
    def get_vendor_models(vendor: ModelVendor) -> list[str]:
        if not vendor.discovered_models_json:
            return []
        try:
            payload = json.loads(vendor.discovered_models_json)
            return [item for item in payload if isinstance(item, str)]
        except json.JSONDecodeError:
            return []


    @staticmethod
    def list_vendors(session: Session) -> list[ModelVendor]:
        return session.query(ModelVendor).order_by(ModelVendor.created_at.asc()).all()

    @staticmethod
    def create_vendor(session: Session, **kwargs: Any) -> ModelVendor:
        vendor = ModelVendor(**ModelConfigService._sanitize_vendor_kwargs(kwargs))
        session.add(vendor)
        session.commit()
        session.refresh(vendor)
        return vendor

    @staticmethod
    def get_vendor(session: Session, vendor_id: str) -> ModelVendor | None:
        return session.query(ModelVendor).filter(ModelVendor.id == vendor_id).first()

    @staticmethod
    def update_vendor(session: Session, vendor: ModelVendor, **kwargs: Any) -> ModelVendor:
        for key, value in ModelConfigService._sanitize_vendor_kwargs(kwargs).items():
            setattr(vendor, key, value)
        session.add(vendor)
        session.commit()
        session.refresh(vendor)
        return vendor

    @staticmethod
    def delete_vendor(session: Session, vendor: ModelVendor) -> None:
        mappings = session.query(CapabilityModelMapping).filter(CapabilityModelMapping.vendor_id == vendor.id).all()
        for mapping in mappings:
            session.delete(mapping)
        session.delete(vendor)
        session.commit()

    @staticmethod
    def list_mappings(session: Session) -> list[CapabilityModelMapping]:
        return session.query(CapabilityModelMapping).order_by(CapabilityModelMapping.capability_type.asc(), CapabilityModelMapping.created_at.asc()).all()

    @staticmethod
    def create_mapping(session: Session, **kwargs: Any) -> CapabilityModelMapping:
        if kwargs.get("is_default"):
            ModelConfigService.clear_default(session, kwargs["capability_type"])
        mapping = CapabilityModelMapping(**kwargs)
        session.add(mapping)
        session.commit()
        session.refresh(mapping)
        return mapping

    @staticmethod
    def get_mapping(session: Session, mapping_id: str) -> CapabilityModelMapping | None:
        return session.query(CapabilityModelMapping).filter(CapabilityModelMapping.id == mapping_id).first()

    @staticmethod
    def update_mapping(session: Session, mapping: CapabilityModelMapping, **kwargs: Any) -> CapabilityModelMapping:
        if kwargs.get("is_default"):
            ModelConfigService.clear_default(session, kwargs.get("capability_type") or mapping.capability_type)
        for key, value in kwargs.items():
            setattr(mapping, key, value)
        session.add(mapping)
        session.commit()
        session.refresh(mapping)
        return mapping

    @staticmethod
    def set_default_mapping(session: Session, mapping: CapabilityModelMapping) -> CapabilityModelMapping:
        ModelConfigService.clear_default(session, mapping.capability_type)
        mapping.is_default = True
        session.add(mapping)
        session.commit()
        session.refresh(mapping)
        return mapping

    @staticmethod
    def delete_mapping(session: Session, mapping: CapabilityModelMapping) -> None:
        session.delete(mapping)
        session.commit()
