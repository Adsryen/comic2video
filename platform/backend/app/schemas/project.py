from datetime import datetime

from pydantic import BaseModel


class ProjectResponse(BaseModel):
    id: str
    name: str
    source_type: str
    status: str
    created_by_user_id: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
