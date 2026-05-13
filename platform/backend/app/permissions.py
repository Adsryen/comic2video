from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db.models import Asset, Job, Project


def is_admin_user(current_user: dict | None) -> bool:
    return (current_user or {}).get("local_user_role") == "admin"


def ensure_project_access(project: Project | None, current_user: dict) -> Project:
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.get("auth_bypassed") or is_admin_user(current_user):
        return project

    if project.created_by_user_id and project.created_by_user_id == current_user.get("local_user_id"):
        return project

    raise HTTPException(status_code=403, detail="You do not have access to this project")


def ensure_job_access(job: Job | None, current_user: dict) -> Job:
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    if current_user.get("auth_bypassed") or is_admin_user(current_user):
        return job

    if job.created_by_user_id and job.created_by_user_id == current_user.get("local_user_id"):
        return job

    raise HTTPException(status_code=403, detail="You do not have access to this job")


def ensure_asset_access(session: Session, asset: Asset | None, current_user: dict) -> Asset:
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")

    if current_user.get("auth_bypassed") or is_admin_user(current_user):
        return asset

    if asset.project_id:
        project = session.query(Project).filter(Project.id == asset.project_id).first()
        ensure_project_access(project, current_user)
        return asset

    if asset.job_id:
        job = session.query(Job).filter(Job.id == asset.job_id).first()
        ensure_job_access(job, current_user)
        return asset

    raise HTTPException(status_code=403, detail="You do not have access to this asset")
