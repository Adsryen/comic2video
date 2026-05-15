from datetime import datetime

from pydantic import BaseModel, Field


class ModelProviderBase(BaseModel):
    provider_type: str
    provider_key: str
    display_name: str
    base_url: str | None = None
    model_name: str | None = None
    is_enabled: bool = True
    auth_type: str | None = None
    api_key: str | None = None
    api_key_masked: str | None = None
    config_json: str | None = None


class ModelProviderCreateRequest(ModelProviderBase):
    is_default: bool = False


class ModelProviderUpdateRequest(BaseModel):
    display_name: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    is_enabled: bool | None = None
    is_default: bool | None = None
    auth_type: str | None = None
    api_key: str | None = None
    config_json: str | None = None


class ModelProviderResponse(ModelProviderBase):
    id: str
    is_default: bool
    last_tested_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelProviderTestResponse(BaseModel):
    ok: bool
    detail: str
    provider_id: str
    last_tested_at: datetime | None = None


class ModelDiscoveryRequest(BaseModel):
    provider_type: str
    provider_key: str
    base_url: str | None = None
    api_key: str | None = None
    config_json: str | None = None


class ModelDiscoveryResponse(BaseModel):
    ok: bool
    models: list[str] = []
    detail: str | None = None


class ModelVendorBase(BaseModel):
    vendor_key: str
    display_name: str
    base_url: str | None = None
    auth_type: str | None = None
    api_key: str | None = None
    api_key_masked: str | None = None
    config_json: str | None = None
    is_enabled: bool = True


class ModelVendorCreateRequest(ModelVendorBase):
    pass


class ModelVendorUpdateRequest(BaseModel):
    vendor_key: str | None = None
    display_name: str | None = None
    base_url: str | None = None
    auth_type: str | None = None
    api_key: str | None = None
    config_json: str | None = None
    is_enabled: bool | None = None


class ModelVendorResponse(ModelVendorBase):
    id: str
    last_tested_at: datetime | None = None
    last_test_status: str | None = None
    last_test_message: str | None = None
    discovered_models: list[str] = []
    discovered_models_json: str | None = None
    discovered_models_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelVendorTestResponse(BaseModel):
    ok: bool
    detail: str | None = None
    vendor_id: str
    last_tested_at: datetime | None = None
    last_test_status: str | None = None
    last_test_message: str | None = None
    models: list[str] = []


class CapabilityModelMappingBase(BaseModel):
    capability_type: str
    vendor_id: str
    model_name: str | None = None
    display_name: str
    is_enabled: bool = True
    config_json: str | None = None


class CapabilityModelMappingCreateRequest(CapabilityModelMappingBase):
    is_default: bool = False


class CapabilityModelMappingUpdateRequest(BaseModel):
    capability_type: str | None = None
    vendor_id: str | None = None
    model_name: str | None = None
    display_name: str | None = None
    is_enabled: bool | None = None
    is_default: bool | None = None
    config_json: str | None = None


class CapabilityModelMappingResponse(CapabilityModelMappingBase):
    id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SystemSettingResponse(BaseModel):
    id: str
    setting_key: str
    setting_value: str
    value_type: str = Field(default="string")
    updated_at: datetime

    model_config = {"from_attributes": True}
