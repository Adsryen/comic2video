from datetime import datetime

from pydantic import BaseModel, Field


class ModelProviderBase(BaseModel):
    provider_type: str
    provider_key: str
    display_name: str
    base_url: str | None = None
    model_name: str | None = None
    is_enabled: bool = True
    config_json: str | None = None


class ModelProviderCreateRequest(ModelProviderBase):
    is_default: bool = False


class ModelProviderUpdateRequest(BaseModel):
    display_name: str | None = None
    base_url: str | None = None
    model_name: str | None = None
    is_enabled: bool | None = None
    is_default: bool | None = None
    config_json: str | None = None


class ModelProviderResponse(ModelProviderBase):
    id: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ModelProviderTestResponse(BaseModel):
    ok: bool
    detail: str
    provider_id: str


class SystemSettingResponse(BaseModel):
    id: str
    setting_key: str
    setting_value: str
    value_type: str = Field(default="string")
    updated_at: datetime

    model_config = {"from_attributes": True}
