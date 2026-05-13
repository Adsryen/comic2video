from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.db.session import get_db
from app.schemas.model_config import (
    ModelProviderCreateRequest,
    ModelProviderResponse,
    ModelProviderTestResponse,
    ModelProviderUpdateRequest,
    SystemSettingResponse,
)
from app.services.model_config_service import ModelConfigService

router = APIRouter(prefix="/api/v1/admin", tags=["admin-model-configs"])


@router.get("/model-providers", response_model=list[ModelProviderResponse])
def list_model_providers(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return ModelConfigService.list_providers(db)


@router.post("/model-providers", response_model=ModelProviderResponse, status_code=201)
def create_model_provider(payload: ModelProviderCreateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return ModelConfigService.create_provider(db, **payload.model_dump())


@router.patch("/model-providers/{provider_id}", response_model=ModelProviderResponse)
def update_model_provider(provider_id: str, payload: ModelProviderUpdateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")

    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    return ModelConfigService.update_provider(db, provider, **updates)


@router.post("/model-providers/{provider_id}/set-default", response_model=ModelProviderResponse)
def set_default_model_provider(provider_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")
    return ModelConfigService.set_default(db, provider)


@router.post("/model-providers/{provider_id}/test", response_model=ModelProviderTestResponse)
def test_model_provider(provider_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    provider = ModelConfigService.get_provider(db, provider_id)
    if not provider:
        raise HTTPException(status_code=404, detail="Model provider not found")

    ok, detail = ModelConfigService.test_provider_connectivity(provider)
    return ModelProviderTestResponse(ok=ok, detail=detail, provider_id=provider.id)


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
