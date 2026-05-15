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
    created_by_user_id: str | None = None
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


class JobRunResponse(BaseModel):
    id: str
    job_id: str
    run_type: str
    status: str
    triggered_by_user_id: str | None = None
    source_run_id: str | None = None
    resume_from_step_name: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobStepRunResponse(BaseModel):
    id: str
    job_run_id: str
    job_id: str
    step_name: str
    attempt_no: int
    status: str
    input_json: str | None = None
    output_json: str | None = None
    error_message: str | None = None
    reused_from_step_run_id: str | None = None
    reused_from_run_id: str | None = None
    reused_from_step_name: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JobResumeRequest(BaseModel):
    from_step_name: str | None = None


class JobRerunRequest(BaseModel):
    from_step_name: str | None = None


class JobRunSummaryResponse(BaseModel):
    run_id: str
    job_id: str
    run_type: str
    status: str
    executed_steps: int
    reused_steps: int
    failed_step_name: str | None = None
    asset_count: int
    last_updated_at: datetime | None = None
