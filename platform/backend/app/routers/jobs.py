import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.db.models import Asset, Job, JobRun, JobStep, JobStepRun, Project, Storyboard
from app.db.session import get_db
from app.permissions import ensure_job_access, ensure_project_access
from app.schemas.asset import AssetResponse
from app.schemas.job import JobCreateRequest, JobResponse, JobRerunRequest, JobResumeRequest, JobRunResponse, JobRunSummaryResponse, JobStepResponse, JobStepRunResponse
from app.workers.pipeline_worker import run_job_pipeline, run_job_run

router = APIRouter(tags=["jobs"])
PIPELINE_STEPS = ["parse", "analyze", "storyboard", "script", "tts", "video", "merge"]


def _asset_public_payload(asset: Asset | None) -> dict:
    metadata = json.loads(asset.metadata_json) if asset and asset.metadata_json else None
    return {
        "video_url": f"/api/v1/storage/{asset.id}" if asset else None,
        "asset_id": asset.id if asset else None,
        "storage_path": asset.storage_path if asset else None,
        "mime_type": asset.mime_type if asset else None,
        "metadata": metadata,
    }


def _find_run_asset(db: Session, run_id: str, asset_type: str) -> Asset | None:
    return (
        db.query(Asset)
        .filter(
            Asset.job_run_id == run_id,
            Asset.asset_type == asset_type,
            Asset.is_latest.is_(True),
        )
        .order_by(Asset.version.desc(), Asset.created_at.desc())
        .first()
    )


def _build_run_summary(db: Session, run: JobRun) -> JobRunSummaryResponse:
    step_runs = db.query(JobStepRun).filter(JobStepRun.job_run_id == run.id).all()
    assets_count = db.query(Asset).filter(Asset.job_run_id == run.id).count()
    executed_steps = len([step for step in step_runs if not step.reused_from_step_run_id and step.status in {"COMPLETED", "FAILED", "RUNNING", "PENDING"}])
    reused_steps = len([step for step in step_runs if step.reused_from_step_run_id])
    failed_step = next((step.step_name for step in step_runs if step.status == "FAILED"), None)
    last_updated_at = max([run.updated_at, *[step.updated_at for step in step_runs if step.updated_at]], default=run.updated_at)
    return JobRunSummaryResponse(
        run_id=run.id,
        job_id=run.job_id,
        run_type=run.run_type,
        status=run.status,
        executed_steps=executed_steps,
        reused_steps=reused_steps,
        failed_step_name=failed_step,
        asset_count=assets_count,
        last_updated_at=last_updated_at,
    )


@router.post("/api/v1/projects/{project_id}/jobs", response_model=JobResponse, status_code=201)
def create_job(project_id: str, payload: JobCreateRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    ensure_project_access(project, current_user)

    job = Job(project_id=project_id, created_by_user_id=current_user.get("local_user_id"), mode=payload.mode, language=payload.language, voice=payload.voice, subtitle_enabled="true" if payload.subtitle_enabled else "false", status="QUEUED", progress=0)
    db.add(job)
    db.flush()

    job_run = JobRun(
        job_id=job.id,
        run_type="initial",
        status="PENDING",
        triggered_by_user_id=current_user.get("local_user_id"),
    )
    db.add(job_run)
    db.flush()

    for step_name in PIPELINE_STEPS:
        db.add(JobStep(job_id=job.id, step_name=step_name, status="PENDING"))
        db.add(JobStepRun(job_run_id=job_run.id, job_id=job.id, step_name=step_name, attempt_no=1, status="PENDING"))

    db.commit()
    db.refresh(job)

    run_job_run(job_run.id)

    db.refresh(job)
    return job


@router.post("/api/v1/jobs/{job_id}/resume", response_model=JobRunResponse, status_code=201)
def resume_job(job_id: str, payload: JobResumeRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)

    latest_run = (
        db.query(JobRun)
        .filter(JobRun.job_id == job_id)
        .order_by(JobRun.created_at.desc())
        .first()
    )
    if not latest_run:
        raise HTTPException(status_code=404, detail="No job run found")

    step_name = payload.from_step_name
    if step_name and step_name not in PIPELINE_STEPS:
        raise HTTPException(status_code=400, detail="Invalid step name")
    step_runs = db.query(JobStepRun).filter(JobStepRun.job_run_id == latest_run.id).all()
    if step_name and step_name not in {step.step_name for step in step_runs}:
        raise HTTPException(status_code=404, detail="Step not found in job run")

    resume_run = JobRun(
        job_id=job.id,
        run_type="resume",
        status="PENDING",
        triggered_by_user_id=current_user.get("local_user_id"),
        source_run_id=latest_run.id,
        resume_from_step_name=step_name,
    )
    db.add(resume_run)
    db.flush()

    for step in PIPELINE_STEPS:
        db.add(JobStepRun(job_run_id=resume_run.id, job_id=job.id, step_name=step, attempt_no=1, status="PENDING"))

    db.commit()
    db.refresh(resume_run)
    run_job_run(resume_run.id)
    db.refresh(resume_run)
    return resume_run


@router.post("/api/v1/jobs/{job_id}/rerun", response_model=JobRunResponse, status_code=201)
def rerun_job(job_id: str, payload: JobRerunRequest, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)

    latest_run = (
        db.query(JobRun)
        .filter(JobRun.job_id == job_id)
        .order_by(JobRun.created_at.desc())
        .first()
    )
    if not latest_run:
        raise HTTPException(status_code=404, detail="No job run found")

    step_name = payload.from_step_name
    if step_name and step_name not in PIPELINE_STEPS:
        raise HTTPException(status_code=400, detail="Invalid step name")
    rerun_type = "rerun_from_step" if step_name else "rerun"

    rerun = JobRun(
        job_id=job.id,
        run_type=rerun_type,
        status="PENDING",
        triggered_by_user_id=current_user.get("local_user_id"),
        source_run_id=latest_run.id,
        resume_from_step_name=step_name,
    )
    db.add(rerun)
    db.flush()

    for step in PIPELINE_STEPS:
        db.add(JobStepRun(job_run_id=rerun.id, job_id=job.id, step_name=step, attempt_no=1, status="PENDING"))

    db.commit()
    db.refresh(rerun)
    run_job_run(rerun.id)
    db.refresh(rerun)
    return rerun


@router.get("/api/v1/jobs/{job_id}/runs", response_model=list[JobRunResponse])
def get_job_runs(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)
    return db.query(JobRun).filter(JobRun.job_id == job_id).order_by(JobRun.created_at.desc()).all()


@router.get("/api/v1/jobs/{job_id}/run-summaries", response_model=list[JobRunSummaryResponse])
def get_job_run_summaries(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)
    runs = db.query(JobRun).filter(JobRun.job_id == job_id).order_by(JobRun.created_at.desc()).all()
    return [_build_run_summary(db, run) for run in runs]


@router.get("/api/v1/job-runs/{run_id}", response_model=JobRunResponse)
def get_job_run(run_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job_run = db.query(JobRun).filter(JobRun.id == run_id).first()
    if not job_run:
        raise HTTPException(status_code=404, detail="Job run not found")
    job = db.query(Job).filter(Job.id == job_run.job_id).first()
    ensure_job_access(job, current_user)
    return job_run


@router.get("/api/v1/job-runs/{run_id}/steps", response_model=list[JobStepRunResponse])
def get_job_run_steps(run_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job_run = db.query(JobRun).filter(JobRun.id == run_id).first()
    if not job_run:
        raise HTTPException(status_code=404, detail="Job run not found")
    job = db.query(Job).filter(Job.id == job_run.job_id).first()
    ensure_job_access(job, current_user)

    step_runs = db.query(JobStepRun).filter(JobStepRun.job_run_id == run_id).order_by(JobStepRun.created_at.asc()).all()
    reused_ids = [step.reused_from_step_run_id for step in step_runs if step.reused_from_step_run_id]
    reused_map = {}
    if reused_ids:
        reused_steps = db.query(JobStepRun).filter(JobStepRun.id.in_(reused_ids)).all()
        reused_map = {step.id: step for step in reused_steps}

    payload = []
    for step in step_runs:
        reused_step = reused_map.get(step.reused_from_step_run_id) if step.reused_from_step_run_id else None
        payload.append(
            JobStepRunResponse(
                id=step.id,
                job_run_id=step.job_run_id,
                job_id=step.job_id,
                step_name=step.step_name,
                attempt_no=step.attempt_no,
                status=step.status,
                input_json=step.input_json,
                output_json=step.output_json,
                error_message=step.error_message,
                reused_from_step_run_id=step.reused_from_step_run_id,
                reused_from_run_id=reused_step.job_run_id if reused_step else None,
                reused_from_step_name=reused_step.step_name if reused_step else None,
                started_at=step.started_at,
                finished_at=step.finished_at,
                created_at=step.created_at,
                updated_at=step.updated_at,
            )
        )
    return payload


@router.get("/api/v1/job-runs/{run_id}/storyboard")
def get_job_run_storyboard(run_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job_run = db.query(JobRun).filter(JobRun.id == run_id).first()
    if not job_run:
        raise HTTPException(status_code=404, detail="Job run not found")
    job = db.query(Job).filter(Job.id == job_run.job_id).first()
    ensure_job_access(job, current_user)
    step_run = (
        db.query(JobStepRun)
        .filter(JobStepRun.job_run_id == run_id, JobStepRun.step_name == "storyboard")
        .order_by(JobStepRun.created_at.desc())
        .first()
    )
    if step_run and step_run.output_json:
        try:
            payload = json.loads(step_run.output_json)
            return payload.get("storyboard", payload)
        except json.JSONDecodeError:
            pass

    asset = _find_run_asset(db, run_id, "storyboard")
    if asset and asset.metadata_json:
        try:
            payload = json.loads(asset.metadata_json)
            return payload.get("storyboard", payload)
        except json.JSONDecodeError:
            pass

    return {"pages": [], "panels": [], "scenes": []}


@router.get("/api/v1/job-runs/{run_id}/result")
def get_job_run_result(run_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job_run = db.query(JobRun).filter(JobRun.id == run_id).first()
    if not job_run:
        raise HTTPException(status_code=404, detail="Job run not found")
    job = db.query(Job).filter(Job.id == job_run.job_id).first()
    ensure_job_access(job, current_user)
    asset = _find_run_asset(db, run_id, "final_video") or _find_run_asset(db, run_id, "video_artifact")
    return _asset_public_payload(asset)


@router.get("/api/v1/job-runs/{run_id}/assets", response_model=list[AssetResponse])
def get_job_run_assets(run_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job_run = db.query(JobRun).filter(JobRun.id == run_id).first()
    if not job_run:
        raise HTTPException(status_code=404, detail="Job run not found")
    job = db.query(Job).filter(Job.id == job_run.job_id).first()
    ensure_job_access(job, current_user)
    return (
        db.query(Asset)
        .filter(Asset.job_run_id == run_id)
        .order_by(Asset.created_at.desc())
        .all()
    )


@router.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    return ensure_job_access(job, current_user)


@router.get("/api/v1/jobs/{job_id}/steps", response_model=list[JobStepResponse])
def get_job_steps(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)
    steps = db.query(JobStep).filter(JobStep.job_id == job_id).all()
    if not steps:
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
    return steps


@router.get("/api/v1/jobs/{job_id}/storyboard")
def get_storyboard(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)
    storyboard = (
        db.query(Storyboard)
        .filter(Storyboard.job_id == job_id)
        .order_by(Storyboard.created_at.desc())
        .first()
    )
    if not storyboard:
        return {"pages": [], "panels": [], "scenes": []}
    return json.loads(storyboard.content_json)


@router.get("/api/v1/jobs/{job_id}/result")
def get_job_result(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)
    asset = (
        db.query(Asset)
        .filter(Asset.job_id == job_id, Asset.asset_type == "final_video")
        .order_by(Asset.created_at.desc())
        .first()
    )
    metadata = json.loads(asset.metadata_json) if asset and asset.metadata_json else None
    return {
        "video_url": f"/api/v1/storage/{asset.id}" if asset else None,
        "asset_id": asset.id if asset else None,
        "storage_path": asset.storage_path if asset else None,
        "mime_type": asset.mime_type if asset else None,
        "metadata": metadata,
    }


@router.get("/api/v1/jobs/{job_id}/assets", response_model=list[AssetResponse])
def get_job_assets(job_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    ensure_job_access(job, current_user)

    return (
        db.query(Asset)
        .filter(Asset.job_id == job_id)
        .order_by(Asset.created_at.desc())
        .all()
    )
