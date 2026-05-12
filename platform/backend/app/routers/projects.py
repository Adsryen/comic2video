import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import BASE_DIR
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
    )


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return ProjectService.list_all(db)


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = ProjectService.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project




@router.get("/{project_id}/jobs", response_model=list[JobResponse])
def get_project_jobs(project_id: str, db: Session = Depends(get_db)):
    project = ProjectService.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectService.list_jobs(db, project_id)

@router.get("/{project_id}/assets", response_model=list[AssetResponse])
def get_project_assets(project_id: str, db: Session = Depends(get_db)):
    project = ProjectService.get_by_id(db, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectService.list_assets(db, project_id)
