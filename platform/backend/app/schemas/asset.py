from datetime import datetime

from pydantic import BaseModel


class AssetResponse(BaseModel):
    id: str
    project_id: str | None
    job_id: str | None = None
    job_run_id: str | None = None
    job_step_run_id: str | None = None
    step_name: str | None = None
    asset_type: str
    storage_path: str
    mime_type: str
    version: int
    is_latest: bool
    created_at: datetime

    model_config = {"from_attributes": True}
