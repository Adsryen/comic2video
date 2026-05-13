import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.auth import require_current_user
from app.config import BASE_DIR
from app.permissions import ensure_project_access
from app.db.session import get_db
from app.schemas.asset import AssetResponse
from app.schemas.job import JobResponse
from app.schemas.project import ProjectResponse
from app.services.ingest_service import IngestService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def get_storage_root() -> str:
    return os.getenv("STORAGE_ROOT", os.path.join(BASE_DIR, "storage"))


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    name: str = Form(...),
    source_file: UploadFile = File(...),
    current_user: dict = Depends(require_current_user),
    db: Session = Depends(get_db),
):
    filename = source_file.filename or ""
    if not filename.lower().endswith((".pdf", ".cbz")):
        raise HTTPException(status_code=400, detail="Only pdf and cbz files are supported")

    content = await source_file.read()
    service = IngestService(get_storage_root())
    return service.create_project_with_upload(
        db,
        name,
        filename,
        source_file.content_type,
        content,
        current_user.get("local_user_id"),
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    projects = ProjectService.list_all(db)
    if current_user.get("auth_bypassed") or current_user.get("local_user_role") == "admin":
        return projects
    return [project for project in projects if project.created_by_user_id == current_user.get("local_user_id")]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    project = ProjectService.get_by_id(db, project_id)
    return ensure_project_access(project, current_user)




@router.get("/{project_id}/jobs", response_model=list[JobResponse])
def get_project_jobs(project_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    project = ProjectService.get_by_id(db, project_id)
    ensure_project_access(project, current_user)
    return ProjectService.list_jobs(db, project_id)

@router.get("/{project_id}/assets", response_model=list[AssetResponse])
def get_project_assets(project_id: str, current_user: dict = Depends(require_current_user), db: Session = Depends(get_db)):
    project = ProjectService.get_by_id(db, project_id)
    ensure_project_access(project, current_user)
    return ProjectService.list_assets(db, project_id)
