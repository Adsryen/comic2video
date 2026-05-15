from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.db.session import get_db
from app.schemas.model_config import (
    ModelDiscoveryRequest,
    ModelDiscoveryResponse,
    ModelProviderCreateRequest,
    ModelProviderResponse,
    ModelProviderTestResponse,
    ModelProviderUpdateRequest,
    SystemSettingResponse,
)
from app.services.model_config_service import ModelConfigService

router = APIRouter(prefix="/api/v1/admin", tags=["admin-model-configs"])


def _serialize_provider(provider):
    payload = TypeAdapter(ModelProviderResponse).validate_python(provider, from_attributes=True).model_dump()
    payload["api_key"] = None
    payload["api_key_masked"] = ModelConfigService.mask_api_key(getattr(provider, "api_key", None))
    return payload


@router.get("/model-providers", response_model=list[ModelProviderResponse])
def list_model_providers(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return [_serialize_provider(provider) for provider in ModelConfigService.list_providers(db)]


@router.post("/model-providers", response_model=ModelProviderResponse, status_code=201)
def create_model_provider(payload: ModelProviderCreateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.create_provider(db, **payload.model_dump())
    return _serialize_provider(provider)


@router.patch("/model-providers/{provider_id}", response_model=ModelProviderResponse)
def update_model_provider(provider_id: str, payload: ModelProviderUpdateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")

    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    provider = ModelConfigService.update_provider(db, provider, **updates)
    return _serialize_provider(provider)


@router.post("/model-providers/{provider_id}/set-default", response_model=ModelProviderResponse)
def set_default_model_provider(provider_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")
    provider = ModelConfigService.set_default(db, provider)
    return _serialize_provider(provider)


@router.post("/model-providers/{provider_id}/test", response_model=ModelProviderTestResponse)
def test_model_provider(provider_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")

    ok, detail = ModelConfigService.test_provider_connectivity(provider)
    provider = ModelConfigService.mark_provider_tested(db, provider)
    return ModelProviderTestResponse(ok=ok, detail=detail, provider_id=provider.id, last_tested_at=provider.last_tested_at)


@router.post("/model-providers/discover-models", response_model=ModelDiscoveryResponse)
def discover_model_provider_models(payload: ModelDiscoveryRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    ok, models, detail = ModelConfigService.discover_models(
        provider_key=payload.provider_key,
        base_url=payload.base_url,
        api_key=payload.api_key,
        config_json=payload.config_json,
    )
    return ModelDiscoveryResponse(ok=ok, models=models, detail=detail)


@router.delete("/model-providers/{provider_id}", status_code=204)
def delete_model_provider(provider_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")
    if provider.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default provider. Switch the default first.")
    ModelConfigService.delete_provider(db, provider)


@router.get("/system-settings", response_model=list[SystemSettingResponse])
def list_system_settings(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return ModelConfigService.list_system_settings(db)
