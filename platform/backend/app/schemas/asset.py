from datetime import datetime

from pydantic import BaseModel


class AssetResponse(BaseModel):
    id: str
    project_id: str | None
    job_id: str | None = None
    asset_type: str
    storage_path: str
    mime_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
