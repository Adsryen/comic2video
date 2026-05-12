import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Asset, Job, JobStep, Project, Storyboard
from app.db.session import get_db
from app.schemas.asset import AssetResponse
from app.schemas.job import JobCreateRequest, JobResponse, JobStepResponse
from app.workers.pipeline_worker import run_job_pipeline

router = APIRouter(tags=["jobs"])
PIPELINE_STEPS = ["parse", "analyze", "storyboard", "script", "tts", "video", "merge"]


@router.post("/api/v1/projects/{project_id}/jobs", response_model=JobResponse, status_code=201)
def create_job(project_id: str, payload: JobCreateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job = Job(project_id=project_id, mode=payload.mode, language=payload.language, voice=payload.voice, subtitle_enabled="true" if payload.subtitle_enabled else "false", status="QUEUED", progress=0)
    db.add(job)
    db.flush()

    for step_name in PIPELINE_STEPS:
        db.add(JobStep(job_id=job.id, step_name=step_name, status="PENDING"))

    db.commit()
    db.refresh(job)

    run_job_pipeline(job.id)

    db.refresh(job)
    return job


@router.get("/api/v1/jobs/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/api/v1/jobs/{job_id}/steps", response_model=list[JobStepResponse])
def get_job_steps(job_id: str, db: Session = Depends(get_db)):
    steps = db.query(JobStep).filter(JobStep.job_id == job_id).all()
    if not steps:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
    return steps


@router.get("/api/v1/jobs/{job_id}/storyboard")
def get_storyboard(job_id: str, db: Session = Depends(get_db)):
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
def get_job_result(job_id: str, db: Session = Depends(get_db)):
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
def get_job_assets(job_id: str, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return (
        db.query(Asset)
        .filter(Asset.job_id == job_id)
        .order_by(Asset.created_at.desc())
        .all()
    )
