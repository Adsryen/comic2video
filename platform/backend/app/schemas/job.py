from datetime import datetime

from pydantic import BaseModel


class JobCreateRequest(BaseModel):
    mode: str
    language: str
    voice: str
    subtitle_enabled: bool


class JobResponse(BaseModel):
    id: str
    project_id: str
    mode: str
    language: str | None = None
    voice: str | None = None
    subtitle_enabled: bool | None = None
    status: str
    progress: int
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None

    model_config = {"from_attributes": True}


class JobStepResponse(BaseModel):
    id: str
    job_id: str
    step_name: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    output_json: str | None = None

    model_config = {"from_attributes": True}
