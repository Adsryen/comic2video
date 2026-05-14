from datetime import datetime

from pydantic import BaseModel


class UserResponse(BaseModel):
    id: str
    external_auth_id: str | None = None
    email: str | None = None
    display_name: str | None = None
    auth_provider: str | None = None
    role: str
    status: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserRoleUpdateRequest(BaseModel):
    role: str
