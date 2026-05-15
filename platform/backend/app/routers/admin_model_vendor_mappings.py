from fastapi import APIRouter, Depends, HTTPException
from pydantic import TypeAdapter
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.db.session import get_db
from app.schemas.model_config import (
    CapabilityModelMappingCreateRequest,
    CapabilityModelMappingResponse,
    CapabilityModelMappingUpdateRequest,
    ModelVendorCreateRequest,
    ModelVendorResponse,
    ModelVendorTestResponse,
    ModelVendorUpdateRequest,
)
from app.services.model_config_service import ModelConfigService

router = APIRouter(prefix="/api/v1/admin", tags=["admin-model-vendors"])


def _serialize_vendor(vendor):
    payload = TypeAdapter(ModelVendorResponse).validate_python(vendor, from_attributes=True).model_dump()
    payload["api_key"] = None
    payload["api_key_masked"] = ModelConfigService.mask_api_key(getattr(vendor, "api_key", None))
    payload["discovered_models_json"] = None
    payload["discovered_models"] = ModelConfigService.get_vendor_models(vendor)
    return payload


@router.get("/model-vendors", response_model=list[ModelVendorResponse])
def list_model_vendors(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return [_serialize_vendor(vendor) for vendor in ModelConfigService.list_vendors(db)]


@router.post("/model-vendors", response_model=ModelVendorResponse, status_code=201)
def create_model_vendor(payload: ModelVendorCreateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    vendor = ModelConfigService.create_vendor(db, **payload.model_dump())
    return _serialize_vendor(vendor)


@router.patch("/model-vendors/{vendor_id}", response_model=ModelVendorResponse)
def update_model_vendor(vendor_id: str, payload: ModelVendorUpdateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    vendor = ModelConfigService.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Model vendor not found")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    vendor = ModelConfigService.update_vendor(db, vendor, **updates)
    return _serialize_vendor(vendor)


@router.post("/model-vendors/{vendor_id}/test", response_model=ModelVendorTestResponse)
def test_model_vendor(vendor_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    vendor = ModelConfigService.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Model vendor not found")

    ok, models, detail, vendor = ModelConfigService.test_vendor(db, vendor)

    return {
        "ok": ok,
        "detail": detail or (f"Discovered {len(models)} models" if ok else "Model discovery failed"),
        "vendor_id": vendor.id,
        "last_tested_at": vendor.last_tested_at,
        "last_test_status": vendor.last_test_status,
        "last_test_message": vendor.last_test_message,
        "models": models,
    }


@router.delete("/model-vendors/{vendor_id}", status_code=204)
def delete_model_vendor(vendor_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    vendor = ModelConfigService.get_vendor(db, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Model vendor not found")
    ModelConfigService.delete_vendor(db, vendor)


@router.get("/capability-model-mappings", response_model=list[CapabilityModelMappingResponse])
def list_capability_model_mappings(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return ModelConfigService.list_mappings(db)


@router.post("/capability-model-mappings", response_model=CapabilityModelMappingResponse, status_code=201)
def create_capability_model_mapping(payload: CapabilityModelMappingCreateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    return ModelConfigService.create_mapping(db, **payload.model_dump())


@router.patch("/capability-model-mappings/{mapping_id}", response_model=CapabilityModelMappingResponse)
def update_capability_model_mapping(mapping_id: str, payload: CapabilityModelMappingUpdateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    mapping = ModelConfigService.get_mapping(db, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Capability model mapping not found")
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    return ModelConfigService.update_mapping(db, mapping, **updates)


@router.post("/capability-model-mappings/{mapping_id}/set-default", response_model=CapabilityModelMappingResponse)
def set_default_capability_model_mapping(mapping_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    mapping = ModelConfigService.get_mapping(db, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Capability model mapping not found")
    return ModelConfigService.set_default_mapping(db, mapping)


@router.delete("/capability-model-mappings/{mapping_id}", status_code=204)
def delete_capability_model_mapping(mapping_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    mapping = ModelConfigService.get_mapping(db, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Capability model mapping not found")
    if mapping.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete the default mapping. Switch the default first.")
    ModelConfigService.delete_mapping(db, mapping)
