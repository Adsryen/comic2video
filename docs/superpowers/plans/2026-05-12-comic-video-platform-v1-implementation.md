# Comic-to-Video Platform V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing `Manhwa-ai` codebase into a v1 comic-to-video platform that supports `pdf` and `cbz` uploads, project/job management, resumable asynchronous generation, storyboard persistence, and a stable `basic` narrated-video path with optional later AniSora integration.

**Architecture:** Keep `Manhwa-ai` as the v1 application shell, but refactor it toward platform boundaries. Introduce persistent project/job/asset/storyboard state, adapter-based model integration, and explicit pipeline steps while preserving the current FastAPI + Celery + React foundation for fast delivery.

**Tech Stack:** FastAPI, Celery, PostgreSQL, SQLAlchemy, Pydantic, React, Vite, ffmpeg, local/object storage, pytest, Alembic (or equivalent migration tool if already preferred during implementation).

---

## File Structure Map

### Backend files to create

- `platform/backend/app/db/base.py`
- `platform/backend/app/db/session.py`
- `platform/backend/app/db/models.py`
- `platform/backend/app/schemas/project.py`
- `platform/backend/app/schemas/job.py`
- `platform/backend/app/schemas/asset.py`
- `platform/backend/app/schemas/storyboard.py`
- `platform/backend/app/routers/projects.py`
- `platform/backend/app/routers/jobs.py`
- `platform/backend/app/routers/assets.py`
- `platform/backend/app/routers/system.py`
- `platform/backend/app/services/project_service.py`
- `platform/backend/app/services/ingest_service.py`
- `platform/backend/app/services/parse_service.py`
- `platform/backend/app/services/analyze_service.py`
- `platform/backend/app/services/storyboard_service.py`
- `platform/backend/app/services/script_service.py`
- `platform/backend/app/services/tts_service.py`
- `platform/backend/app/services/video_service.py`
- `platform/backend/app/services/render_service.py`
- `platform/backend/app/adapters/storage_adapter.py`
- `platform/backend/app/adapters/ocr_adapter.py`
- `platform/backend/app/adapters/vision_adapter.py`
- `platform/backend/app/adapters/script_adapter.py`
- `platform/backend/app/adapters/tts_adapter.py`
- `platform/backend/app/adapters/video_adapter.py`
- `platform/backend/app/workers/pipeline_worker.py`
- `platform/backend/app/workers/step_runner.py`
- `platform/backend/tests/test_projects_api.py`
- `platform/backend/tests/test_jobs_api.py`
- `platform/backend/tests/test_parse_service.py`
- `platform/backend/tests/test_storyboard_service.py`

### Backend files to modify

- `platform/backend/app/main.py`
- `platform/backend/app/config.py`
- `platform/backend/app/celery_app.py`
- `platform/backend/app/worker.py`
- `platform/backend/app/utils/pdf_utils.py`
- `platform/backend/app/utils/tts_utils.py`
- `platform/backend/app/utils/vision_utils.py`
- `platform/backend/requirements.txt`
- `platform/backend/.env.example`

### Frontend files to create

- `platform/frontend/src/api/projects.js`
- `platform/frontend/src/api/jobs.js`
- `platform/frontend/src/api/assets.js`
- `platform/frontend/src/pages/Projects.jsx`
- `platform/frontend/src/pages/ProjectDetail.jsx`
- `platform/frontend/src/pages/JobDetail.jsx`
- `platform/frontend/src/components/platform/ProjectList.jsx`
- `platform/frontend/src/components/platform/ProjectUploadForm.jsx`
- `platform/frontend/src/components/platform/JobCreateForm.jsx`
- `platform/frontend/src/components/platform/JobStatusPanel.jsx`
- `platform/frontend/src/components/platform/StoryboardPreview.jsx`
- `platform/frontend/src/components/platform/AssetGallery.jsx`
- `platform/frontend/src/components/platform/VideoResultCard.jsx`

### Frontend files to modify

- `platform/frontend/src/App.jsx`
- `platform/frontend/src/routing/Routing.jsx`
- `platform/frontend/src/pages/Upload.jsx`
- `platform/frontend/src/api/api.js`
- `platform/frontend/src/utils/videoMaker.js`

## Task 1: Establish backend persistence foundation

**Files:**
- Create: `platform/backend/app/db/base.py`
- Create: `platform/backend/app/db/session.py`
- Create: `platform/backend/app/db/models.py`
- Modify: `platform/backend/app/config.py`
- Modify: `platform/backend/requirements.txt`
- Test: `platform/backend/tests/test_projects_api.py`

- [ ] **Step 1: Write the failing API test for project creation persistence**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_project_requires_database_backed_response(monkeypatch):
    response = client.post(
        "/api/v1/projects",
        data={"name": "One Piece"},
        files={"source_file": ("chapter1.pdf", b"fake-pdf", "application/pdf")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "One Piece"
    assert data["source_type"] == "pdf"
    assert data["status"] == "UPLOADED"
    assert "id" in data
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `cd platform/backend && pytest tests/test_projects_api.py::test_create_project_requires_database_backed_response -v`
Expected: FAIL because `/api/v1/projects` and database setup do not exist.

- [ ] **Step 3: Add minimal database configuration and models**

```python
# app/db/base.py
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

```python
# app/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)
```

```python
# app/db/models.py
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_asset_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("assets.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("projects.id"), nullable=True)
    job_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=True)
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
```

```python
# app/config.py
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'comic_video.db')}")
```

```text
# requirements.txt additions
sqlalchemy>=2.0
```

- [ ] **Step 4: Run the test again and confirm the failure changed to missing router logic**

Run: `cd platform/backend && pytest tests/test_projects_api.py::test_create_project_requires_database_backed_response -v`
Expected: FAIL because route implementation still does not exist, proving persistence setup is wired into import paths.

- [ ] **Step 5: Commit the persistence foundation**

```bash
git add platform/backend/app/db/base.py \
  platform/backend/app/db/session.py \
  platform/backend/app/db/models.py \
  platform/backend/app/config.py \
  platform/backend/requirements.txt \
  platform/backend/tests/test_projects_api.py

git commit -m "feat: add backend persistence foundation"
```

## Task 2: Add project and asset APIs with local storage-backed uploads

**Files:**
- Create: `platform/backend/app/schemas/project.py`
- Create: `platform/backend/app/schemas/asset.py`
- Create: `platform/backend/app/adapters/storage_adapter.py`
- Create: `platform/backend/app/services/project_service.py`
- Create: `platform/backend/app/services/ingest_service.py`
- Create: `platform/backend/app/routers/projects.py`
- Modify: `platform/backend/app/main.py`
- Modify: `platform/backend/.env.example`
- Test: `platform/backend/tests/test_projects_api.py`

- [ ] **Step 1: Expand the failing tests for project creation and listing**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_create_project_returns_uploaded_project():
    response = client.post(
        "/api/v1/projects",
        data={"name": "Naruto"},
        files={"source_file": ("chapter01.cbz", b"fake-cbz", "application/x-cbz")},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Naruto"
    assert data["source_type"] == "cbz"
    assert data["status"] == "UPLOADED"


def test_list_projects_returns_created_project():
    create_response = client.post(
        "/api/v1/projects",
        data={"name": "Bleach"},
        files={"source_file": ("chapter01.pdf", b"fake-pdf", "application/pdf")},
    )
    assert create_response.status_code == 201

    list_response = client.get("/api/v1/projects")
    assert list_response.status_code == 200
    payload = list_response.json()
    assert any(project["name"] == "Bleach" for project in payload)
```

- [ ] **Step 2: Run the tests to confirm failure**

Run: `cd platform/backend && pytest tests/test_projects_api.py -v`
Expected: FAIL because schemas, storage adapter, and routes are still missing.

- [ ] **Step 3: Implement project schemas, storage adapter, service, and router**

```python
# app/schemas/project.py
from datetime import datetime
from pydantic import BaseModel


class ProjectResponse(BaseModel):
    id: str
    name: str
    source_type: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

```python
# app/schemas/asset.py
from datetime import datetime
from pydantic import BaseModel


class AssetResponse(BaseModel):
    id: str
    project_id: str | None
    asset_type: str
    storage_path: str
    mime_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
```

```python
# app/adapters/storage_adapter.py
import os
from pathlib import Path


class LocalStorageAdapter:
    def __init__(self, root_dir: str):
        self.root_dir = Path(root_dir)
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def save_bytes(self, relative_path: str, content: bytes) -> str:
        destination = self.root_dir / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
        return str(destination)
```

```python
# app/services/project_service.py
from app.db.models import Project


class ProjectService:
    @staticmethod
    def create(session, name: str, source_type: str) -> Project:
        project = Project(name=name, source_type=source_type, status="UPLOADED")
        session.add(project)
        session.flush()
        return project

    @staticmethod
    def list_all(session):
        return session.query(Project).order_by(Project.created_at.desc()).all()
```

```python
# app/services/ingest_service.py
import os
from app.adapters.storage_adapter import LocalStorageAdapter
from app.db.models import Asset
from app.services.project_service import ProjectService


class IngestService:
    def __init__(self, storage_root: str):
        self.storage = LocalStorageAdapter(storage_root)

    def create_project_with_upload(self, session, name: str, filename: str, content_type: str, content: bytes):
        ext = os.path.splitext(filename)[1].lower()
        source_type = "cbz" if ext == ".cbz" else "pdf"
        project = ProjectService.create(session, name=name, source_type=source_type)
        storage_path = self.storage.save_bytes(f"projects/{project.id}/source{ext}", content)
        asset = Asset(
            project_id=project.id,
            asset_type="source_file",
            storage_path=storage_path,
            mime_type=content_type,
        )
        session.add(asset)
        session.flush()
        project.source_asset_id = asset.id
        session.commit()
        session.refresh(project)
        return project
```

```python
# app/routers/projects.py
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException
from sqlalchemy.orm import Session
from app.config import STORAGE_ROOT
from app.db.session import SessionLocal
from app.schemas.project import ProjectResponse
from app.services.ingest_service import IngestService
from app.services.project_service import ProjectService

router = APIRouter(prefix="/api/v1/projects", tags=["projects"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    name: str = Form(...),
    source_file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not source_file.filename.lower().endswith((".pdf", ".cbz")):
        raise HTTPException(status_code=400, detail="Only pdf and cbz files are supported")

    content = await source_file.read()
    service = IngestService(STORAGE_ROOT)
    return service.create_project_with_upload(db, name, source_file.filename, source_file.content_type, content)


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    return ProjectService.list_all(db)
```

```python
# app/config.py addition
STORAGE_ROOT = os.getenv("STORAGE_ROOT", os.path.join(BASE_DIR, "storage"))
```

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.projects import router as projects_router

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(projects_router)
```

```env
# .env.example additions
DATABASE_URL=sqlite:///./comic_video.db
STORAGE_ROOT=./storage
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `cd platform/backend && pytest tests/test_projects_api.py -v`
Expected: PASS for create and list project API coverage.

- [ ] **Step 5: Commit the project and asset API slice**

```bash
git add platform/backend/app/schemas/project.py \
  platform/backend/app/schemas/asset.py \
  platform/backend/app/adapters/storage_adapter.py \
  platform/backend/app/services/project_service.py \
  platform/backend/app/services/ingest_service.py \
  platform/backend/app/routers/projects.py \
  platform/backend/app/main.py \
  platform/backend/app/config.py \
  platform/backend/.env.example \
  platform/backend/tests/test_projects_api.py

git commit -m "feat: add project upload and listing APIs"
```

## Task 3: Add jobs, job steps, and status APIs

**Files:**
- Create: `platform/backend/app/schemas/job.py`
- Create: `platform/backend/app/routers/jobs.py`
- Create: `platform/backend/app/routers/system.py`
- Modify: `platform/backend/app/db/models.py`
- Modify: `platform/backend/app/main.py`
- Modify: `platform/backend/app/celery_app.py`
- Test: `platform/backend/tests/test_jobs_api.py`

- [ ] **Step 1: Write failing tests for job creation and step inspection**

```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def _create_project():
    response = client.post(
        "/api/v1/projects",
        data={"name": "Attack on Titan"},
        files={"source_file": ("chapter.pdf", b"fake-pdf", "application/pdf")},
    )
    return response.json()["id"]


def test_create_job_returns_queued_job():
    project_id = _create_project()
    response = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["project_id"] == project_id
    assert data["status"] == "QUEUED"
    assert data["mode"] == "basic"


def test_job_steps_initially_include_parse_stage():
    project_id = _create_project()
    job_response = client.post(
        f"/api/v1/projects/{project_id}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    )
    job_id = job_response.json()["id"]

    steps_response = client.get(f"/api/v1/jobs/{job_id}/steps")
    assert steps_response.status_code == 200
    steps = steps_response.json()
    assert steps[0]["step_name"] == "parse"
    assert steps[0]["status"] == "PENDING"
```

- [ ] **Step 2: Run the tests to confirm failure**

Run: `cd platform/backend && pytest tests/test_jobs_api.py -v`
Expected: FAIL because jobs and job steps do not exist.

- [ ] **Step 3: Add job models, schemas, and APIs**

```python
# app/db/models.py additions
class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), default="generate_video", nullable=False)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False)
    progress: Mapped[int] = mapped_column(default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class JobStep(Base):
    __tablename__ = "job_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    step_name: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    input_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

```python
# app/schemas/job.py
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
    status: str
    progress: int
    created_at: datetime

    model_config = {"from_attributes": True}


class JobStepResponse(BaseModel):
    id: str
    job_id: str
    step_name: str
    status: str

    model_config = {"from_attributes": True}
```

```python
# app/routers/jobs.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.models import Job, JobStep, Project
from app.db.session import SessionLocal
from app.schemas.job import JobCreateRequest, JobResponse, JobStepResponse

router = APIRouter(tags=["jobs"])
PIPELINE_STEPS = ["parse", "analyze", "storyboard", "script", "tts", "video", "merge"]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/api/v1/projects/{project_id}/jobs", response_model=JobResponse, status_code=201)
def create_job(project_id: str, payload: JobCreateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    job = Job(project_id=project_id, mode=payload.mode, status="QUEUED", progress=0)
    db.add(job)
    db.flush()

    for step_name in PIPELINE_STEPS:
        db.add(JobStep(job_id=job.id, step_name=step_name, status="PENDING"))

    db.commit()
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
    return db.query(JobStep).filter(JobStep.job_id == job_id).all()
```

```python
# app/routers/system.py
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health")
def health_check():
    return {"status": "ok"}
```

```python
# app/main.py additions
from app.routers.jobs import router as jobs_router
from app.routers.system import router as system_router

app.include_router(jobs_router)
app.include_router(system_router)
```

- [ ] **Step 4: Run tests and confirm job APIs pass**

Run: `cd platform/backend && pytest tests/test_jobs_api.py -v`
Expected: PASS for job creation and step inspection.

- [ ] **Step 5: Commit the job status layer**

```bash
git add platform/backend/app/schemas/job.py \
  platform/backend/app/routers/jobs.py \
  platform/backend/app/routers/system.py \
  platform/backend/app/db/models.py \
  platform/backend/app/main.py \
  platform/backend/tests/test_jobs_api.py

git commit -m "feat: add jobs and step tracking APIs"
```

## Task 4: Add unified PDF and CBZ parsing services

**Files:**
- Create: `platform/backend/app/services/parse_service.py`
- Modify: `platform/backend/app/utils/pdf_utils.py`
- Test: `platform/backend/tests/test_parse_service.py`

- [ ] **Step 1: Write failing tests for PDF and CBZ input normalization**

```python
from pathlib import Path
from app.services.parse_service import ParseService


def test_detect_source_type_for_pdf(tmp_path: Path):
    pdf_path = tmp_path / "chapter.pdf"
    pdf_path.write_bytes(b"fake-pdf")

    assert ParseService.detect_source_type(str(pdf_path)) == "pdf"


def test_detect_source_type_for_cbz(tmp_path: Path):
    cbz_path = tmp_path / "chapter.cbz"
    cbz_path.write_bytes(b"fake-cbz")

    assert ParseService.detect_source_type(str(cbz_path)) == "cbz"
```

- [ ] **Step 2: Run the tests to confirm failure**

Run: `cd platform/backend && pytest tests/test_parse_service.py -v`
Expected: FAIL because `ParseService` does not exist.

- [ ] **Step 3: Implement a minimal parse service and CBZ extraction hook**

```python
# app/services/parse_service.py
import os
import zipfile
from pathlib import Path
from app.utils.pdf_utils import extract_pdf_images_high_quality


class ParseService:
    @staticmethod
    def detect_source_type(source_path: str) -> str:
        suffix = Path(source_path).suffix.lower()
        if suffix == ".pdf":
            return "pdf"
        if suffix == ".cbz":
            return "cbz"
        raise ValueError(f"Unsupported source type: {suffix}")

    @staticmethod
    def extract_pages(source_path: str, output_dir: str):
        source_type = ParseService.detect_source_type(source_path)
        if source_type == "pdf":
            return extract_pdf_images_high_quality(source_path)

        os.makedirs(output_dir, exist_ok=True)
        with zipfile.ZipFile(source_path, "r") as archive:
            archive.extractall(output_dir)
        return sorted(
            [str(Path(output_dir) / name) for name in archive.namelist() if name.lower().endswith((".png", ".jpg", ".jpeg", ".webp"))]
        )
```

```python
# app/utils/pdf_utils.py addition idea
# keep current extraction logic, but ensure the public API remains stable:
# def extract_pdf_images_high_quality(pdf_path: str, dpi: int = 120, max_pages: int = 50) -> List[Image.Image]
```

- [ ] **Step 4: Run tests and confirm parse normalization passes**

Run: `cd platform/backend && pytest tests/test_parse_service.py -v`
Expected: PASS for source-type detection.

- [ ] **Step 5: Commit the parsing service foundation**

```bash
git add platform/backend/app/services/parse_service.py \
  platform/backend/app/utils/pdf_utils.py \
  platform/backend/tests/test_parse_service.py

git commit -m "feat: add unified pdf and cbz parse service"
```

## Task 5: Add storyboard schema and assembly service

**Files:**
- Create: `platform/backend/app/schemas/storyboard.py`
- Create: `platform/backend/app/services/storyboard_service.py`
- Modify: `platform/backend/app/db/models.py`
- Test: `platform/backend/tests/test_storyboard_service.py`

- [ ] **Step 1: Write a failing storyboard assembly test**

```python
from app.services.storyboard_service import StoryboardService


def test_storyboard_service_creates_scene_entries():
    panels = [
        {"panel_id": "p1", "page_index": 0, "ocr_text": "Hello", "scene_description": "Hero speaks", "importance_score": 0.9},
        {"panel_id": "p2", "page_index": 0, "ocr_text": "World", "scene_description": "Villain appears", "importance_score": 0.8},
    ]

    storyboard = StoryboardService.build(panels)

    assert len(storyboard["scenes"]) == 2
    assert storyboard["scenes"][0]["panel_ids"] == ["p1"]
    assert storyboard["scenes"][0]["video_mode"] == "basic"
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `cd platform/backend && pytest tests/test_storyboard_service.py -v`
Expected: FAIL because the storyboard service does not exist.

- [ ] **Step 3: Implement storyboard schema and service**

```python
# app/schemas/storyboard.py
from pydantic import BaseModel


class StoryboardScene(BaseModel):
    scene_index: int
    panel_ids: list[str]
    narration_text: str
    subtitle_text: str
    video_mode: str
    video_prompt: str
    duration: float
    audio_asset_id: str | None = None
    clip_asset_id: str | None = None
```

```python
# app/services/storyboard_service.py
class StoryboardService:
    @staticmethod
    def build(panels: list[dict]) -> dict:
        scenes = []
        for index, panel in enumerate(panels):
            scenes.append(
                {
                    "scene_index": index,
                    "panel_ids": [panel["panel_id"]],
                    "narration_text": panel.get("ocr_text") or panel.get("scene_description") or "",
                    "subtitle_text": panel.get("ocr_text") or "",
                    "video_mode": "basic",
                    "video_prompt": panel.get("scene_description") or "",
                    "duration": 4.0,
                    "audio_asset_id": None,
                    "clip_asset_id": None,
                }
            )
        return {"pages": [], "panels": panels, "scenes": scenes}
```

```python
# app/db/models.py addition
class Storyboard(Base):
    __tablename__ = "storyboards"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    content_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
```

- [ ] **Step 4: Run tests and confirm storyboard assembly passes**

Run: `cd platform/backend && pytest tests/test_storyboard_service.py -v`
Expected: PASS.

- [ ] **Step 5: Commit storyboard foundation**

```bash
git add platform/backend/app/schemas/storyboard.py \
  platform/backend/app/services/storyboard_service.py \
  platform/backend/app/db/models.py \
  platform/backend/tests/test_storyboard_service.py

git commit -m "feat: add storyboard schema and assembly service"
```

## Task 6: Replace monolithic worker with step-based pipeline orchestration

**Files:**
- Create: `platform/backend/app/workers/step_runner.py`
- Create: `platform/backend/app/workers/pipeline_worker.py`
- Modify: `platform/backend/app/worker.py`
- Modify: `platform/backend/app/celery_app.py`
- Test: `platform/backend/tests/test_jobs_api.py`

- [ ] **Step 1: Write a failing test for queued jobs staying traceable through pipeline execution**

```python
def test_new_job_starts_with_pending_steps_only(client):
    project = client.post(
        "/api/v1/projects",
        data={"name": "Demon Slayer"},
        files={"source_file": ("chapter.pdf", b"fake-pdf", "application/pdf")},
    ).json()

    job = client.post(
        f"/api/v1/projects/{project['id']}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    steps = client.get(f"/api/v1/jobs/{job['id']}/steps").json()
    assert all(step["status"] == "PENDING" for step in steps)
```

- [ ] **Step 2: Run the test to confirm the current implementation state**

Run: `cd platform/backend && pytest tests/test_jobs_api.py::test_new_job_starts_with_pending_steps_only -v`
Expected: PASS or FAIL depending on prior work; keep this as the safety net before replacing the old worker.

- [ ] **Step 3: Implement step-runner scaffolding and stop using monolithic worker logic for new jobs**

```python
# app/workers/step_runner.py
from app.db.models import JobStep


class StepRunner:
    @staticmethod
    def mark_running(session, step: JobStep):
        step.status = "RUNNING"
        session.commit()

    @staticmethod
    def mark_completed(session, step: JobStep, output_json: str | None = None):
        step.status = "COMPLETED"
        step.output_json = output_json
        session.commit()

    @staticmethod
    def mark_failed(session, step: JobStep, error_message: str):
        step.status = "FAILED"
        step.error_message = error_message
        session.commit()
```

```python
# app/workers/pipeline_worker.py
from app.db.session import SessionLocal
from app.db.models import Job, JobStep


def run_job_pipeline(job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        job.status = "RUNNING"
        db.commit()

        steps = db.query(JobStep).filter(JobStep.job_id == job_id).all()
        for step in steps:
            if step.status != "PENDING":
                continue
            step.status = "COMPLETED"
            db.commit()

        job.status = "COMPLETED"
        job.progress = 100
        db.commit()
    finally:
        db.close()
```

```python
# app/worker.py
from app.workers.pipeline_worker import run_job_pipeline

__all__ = ["run_job_pipeline"]
```

- [ ] **Step 4: Run the job API tests to ensure the worker refactor did not break contracts**

Run: `cd platform/backend && pytest tests/test_jobs_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit the pipeline orchestration scaffold**

```bash
git add platform/backend/app/workers/step_runner.py \
  platform/backend/app/workers/pipeline_worker.py \
  platform/backend/app/worker.py \
  platform/backend/app/celery_app.py \
  platform/backend/tests/test_jobs_api.py

git commit -m "refactor: scaffold step-based job pipeline"
```

## Task 7: Add frontend project list and upload flow

**Files:**
- Create: `platform/frontend/src/api/projects.js`
- Create: `platform/frontend/src/components/platform/ProjectList.jsx`
- Create: `platform/frontend/src/components/platform/ProjectUploadForm.jsx`
- Create: `platform/frontend/src/pages/Projects.jsx`
- Modify: `platform/frontend/src/routing/Routing.jsx`
- Modify: `platform/frontend/src/api/api.js`
- Test: manual browser test documented in plan

- [ ] **Step 1: Add a frontend smoke checklist before implementation**

```text
Manual acceptance checklist:
1. Visit /projects
2. See an empty or populated project list
3. Upload a pdf or cbz
4. Receive success feedback
5. See the new project appear in the list
```

- [ ] **Step 2: Implement project API client and page components**

```javascript
// src/api/projects.js
import api from './api';

export const listProjects = async () => {
  const response = await api.get('/api/v1/projects');
  return response.data;
};

export const createProject = async (formData) => {
  const response = await api.post('/api/v1/projects', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
```

```jsx
// src/components/platform/ProjectUploadForm.jsx
import { useState } from 'react';
import { createProject } from '../../api/projects';

export default function ProjectUploadForm({ onCreated }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append('name', name);
    formData.append('source_file', file);
    const project = await createProject(formData);
    onCreated(project);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Project name" />
      <input type="file" accept=".pdf,.cbz" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <button type="submit">Create Project</button>
    </form>
  );
}
```

```jsx
// src/components/platform/ProjectList.jsx
export default function ProjectList({ projects }) {
  return (
    <ul>
      {projects.map((project) => (
        <li key={project.id}>{project.name} - {project.status}</li>
      ))}
    </ul>
  );
}
```

```jsx
// src/pages/Projects.jsx
import { useEffect, useState } from 'react';
import { listProjects } from '../api/projects';
import ProjectList from '../components/platform/ProjectList';
import ProjectUploadForm from '../components/platform/ProjectUploadForm';

export default function Projects() {
  const [projects, setProjects] = useState([]);

  const refresh = async () => {
    setProjects(await listProjects());
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <div>
      <h1>Projects</h1>
      <ProjectUploadForm onCreated={refresh} />
      <ProjectList projects={projects} />
    </div>
  );
}
```

- [ ] **Step 3: Wire the route and base API config**

```javascript
// src/api/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
});

export default api;
```

```jsx
// src/routing/Routing.jsx
import { Routes, Route } from 'react-router-dom';
import Projects from '../pages/Projects';

export default function Routing() {
  return (
    <Routes>
      <Route path="/projects" element={<Projects />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Run the frontend and execute the smoke checklist**

Run: `cd platform/frontend && npm run dev`
Expected: `/projects` loads and can create a project against the backend.

- [ ] **Step 5: Commit the frontend project flow**

```bash
git add platform/frontend/src/api/projects.js \
  platform/frontend/src/components/platform/ProjectList.jsx \
  platform/frontend/src/components/platform/ProjectUploadForm.jsx \
  platform/frontend/src/pages/Projects.jsx \
  platform/frontend/src/routing/Routing.jsx \
  platform/frontend/src/api/api.js

git commit -m "feat: add project list and upload frontend"
```

## Task 8: Add frontend job creation and detail views

**Files:**
- Create: `platform/frontend/src/api/jobs.js`
- Create: `platform/frontend/src/pages/ProjectDetail.jsx`
- Create: `platform/frontend/src/pages/JobDetail.jsx`
- Create: `platform/frontend/src/components/platform/JobCreateForm.jsx`
- Create: `platform/frontend/src/components/platform/JobStatusPanel.jsx`
- Modify: `platform/frontend/src/routing/Routing.jsx`
- Test: manual browser test documented in plan

- [ ] **Step 1: Write the manual acceptance checklist for job flows**

```text
Manual acceptance checklist:
1. Open a project detail page
2. Start a basic generation job
3. Land on a job detail view
4. See queued or running step statuses
5. Refresh and still see the same job state
```

- [ ] **Step 2: Implement job API client and UI components**

```javascript
// src/api/jobs.js
import api from './api';

export const createJob = async (projectId, payload) => {
  const response = await api.post(`/api/v1/projects/${projectId}/jobs`, payload);
  return response.data;
};

export const getJob = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}`);
  return response.data;
};

export const getJobSteps = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/steps`);
  return response.data;
};
```

```jsx
// src/components/platform/JobCreateForm.jsx
import { useState } from 'react';
import { createJob } from '../../api/jobs';

export default function JobCreateForm({ projectId, onCreated }) {
  const [mode, setMode] = useState('basic');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const job = await createJob(projectId, {
      mode,
      language: 'zh',
      voice: 'default',
      subtitle_enabled: true,
    });
    onCreated(job);
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={mode} onChange={(event) => setMode(event.target.value)}>
        <option value="basic">basic</option>
        <option value="hybrid">hybrid</option>
      </select>
      <button type="submit">Generate Video</button>
    </form>
  );
}
```

```jsx
// src/components/platform/JobStatusPanel.jsx
export default function JobStatusPanel({ job, steps }) {
  return (
    <div>
      <h2>{job.status}</h2>
      <ul>
        {steps.map((step) => (
          <li key={step.id}>{step.step_name}: {step.status}</li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Add project detail and job detail pages with route wiring**

```jsx
// src/pages/ProjectDetail.jsx
import { useNavigate, useParams } from 'react-router-dom';
import JobCreateForm from '../components/platform/JobCreateForm';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Project {projectId}</h1>
      <JobCreateForm projectId={projectId} onCreated={(job) => navigate(`/jobs/${job.id}`)} />
    </div>
  );
}
```

```jsx
// src/pages/JobDetail.jsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getJob, getJobSteps } from '../api/jobs';
import JobStatusPanel from '../components/platform/JobStatusPanel';

export default function JobDetail() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [steps, setSteps] = useState([]);

  useEffect(() => {
    const load = async () => {
      setJob(await getJob(jobId));
      setSteps(await getJobSteps(jobId));
    };
    load();
  }, [jobId]);

  if (!job) return <div>Loading...</div>;
  return <JobStatusPanel job={job} steps={steps} />;
}
```

```jsx
// src/routing/Routing.jsx additions
<Route path="/projects/:projectId" element={<ProjectDetail />} />
<Route path="/jobs/:jobId" element={<JobDetail />} />
```

- [ ] **Step 4: Run the frontend and validate the job flow checklist**

Run: `cd platform/frontend && npm run dev`
Expected: projects can create jobs and job detail pages show step status.

- [ ] **Step 5: Commit the job flow frontend**

```bash
git add platform/frontend/src/api/jobs.js \
  platform/frontend/src/pages/ProjectDetail.jsx \
  platform/frontend/src/pages/JobDetail.jsx \
  platform/frontend/src/components/platform/JobCreateForm.jsx \
  platform/frontend/src/components/platform/JobStatusPanel.jsx \
  platform/frontend/src/routing/Routing.jsx

git commit -m "feat: add job creation and detail frontend"
```

## Task 9: Add storyboard and final-result APIs for the stable basic path

**Files:**
- Create: `platform/backend/app/routers/assets.py`
- Modify: `platform/backend/app/routers/jobs.py`
- Modify: `platform/backend/app/services/storyboard_service.py`
- Modify: `platform/backend/app/services/render_service.py`
- Test: `platform/backend/tests/test_jobs_api.py`

- [ ] **Step 1: Write a failing API test for job result access**

```python
def test_get_job_result_returns_final_video_placeholder(client):
    project = client.post(
        "/api/v1/projects",
        data={"name": "Jujutsu Kaisen"},
        files={"source_file": ("chapter.pdf", b"fake-pdf", "application/pdf")},
    ).json()
    job = client.post(
        f"/api/v1/projects/{project['id']}/jobs",
        json={"mode": "basic", "language": "zh", "voice": "default", "subtitle_enabled": True},
    ).json()

    response = client.get(f"/api/v1/jobs/{job['id']}/result")
    assert response.status_code == 200
    payload = response.json()
    assert "video_url" in payload
```

- [ ] **Step 2: Run the test to confirm failure**

Run: `cd platform/backend && pytest tests/test_jobs_api.py::test_get_job_result_returns_final_video_placeholder -v`
Expected: FAIL because result API does not exist.

- [ ] **Step 3: Add result and storyboard endpoints with placeholder-safe basic output contracts**

```python
# app/routers/jobs.py additions
@router.get("/api/v1/jobs/{job_id}/storyboard")
def get_storyboard(job_id: str, db: Session = Depends(get_db)):
    storyboard = db.query(Storyboard).filter(Storyboard.job_id == job_id).order_by(Storyboard.created_at.desc()).first()
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
    return {"video_url": asset.storage_path if asset else None}
```

```python
# app/services/render_service.py
class RenderService:
    @staticmethod
    def build_placeholder_result(storage_path: str) -> dict:
        return {"video_url": storage_path}
```

- [ ] **Step 4: Run the job API tests and confirm result contracts pass**

Run: `cd platform/backend && pytest tests/test_jobs_api.py -v`
Expected: PASS.

- [ ] **Step 5: Commit the result API layer**

```bash
git add platform/backend/app/routers/assets.py \
  platform/backend/app/routers/jobs.py \
  platform/backend/app/services/storyboard_service.py \
  platform/backend/app/services/render_service.py \
  platform/backend/tests/test_jobs_api.py

git commit -m "feat: add storyboard and result APIs"
```

## Task 10: Add frontend storyboard and result views

**Files:**
- Create: `platform/frontend/src/components/platform/StoryboardPreview.jsx`
- Create: `platform/frontend/src/components/platform/AssetGallery.jsx`
- Create: `platform/frontend/src/components/platform/VideoResultCard.jsx`
- Modify: `platform/frontend/src/api/jobs.js`
- Modify: `platform/frontend/src/pages/JobDetail.jsx`
- Test: manual browser test documented in plan

- [ ] **Step 1: Write the manual acceptance checklist for result views**

```text
Manual acceptance checklist:
1. Open a job detail page
2. See scene or step information
3. See a video result area even if empty
4. See storyboard scenes if available
5. Refresh and confirm the page is stable
```

- [ ] **Step 2: Extend the job API client and UI components**

```javascript
// src/api/jobs.js additions
export const getStoryboard = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/storyboard`);
  return response.data;
};

export const getJobResult = async (jobId) => {
  const response = await api.get(`/api/v1/jobs/${jobId}/result`);
  return response.data;
};
```

```jsx
// src/components/platform/StoryboardPreview.jsx
export default function StoryboardPreview({ storyboard }) {
  return (
    <div>
      <h3>Scenes</h3>
      <ul>
        {(storyboard?.scenes || []).map((scene) => (
          <li key={scene.scene_index}>{scene.subtitle_text || scene.narration_text}</li>
        ))}
      </ul>
    </div>
  );
}
```

```jsx
// src/components/platform/VideoResultCard.jsx
export default function VideoResultCard({ result }) {
  if (!result?.video_url) {
    return <div>No video yet.</div>;
  }

  return (
    <div>
      <video src={result.video_url} controls width="640" />
    </div>
  );
}
```

- [ ] **Step 3: Update the job detail page to load storyboard and result data**

```jsx
// src/pages/JobDetail.jsx additions
import { getJob, getJobSteps, getStoryboard, getJobResult } from '../api/jobs';
import StoryboardPreview from '../components/platform/StoryboardPreview';
import VideoResultCard from '../components/platform/VideoResultCard';

const [storyboard, setStoryboard] = useState({ scenes: [] });
const [result, setResult] = useState({ video_url: null });

useEffect(() => {
  const load = async () => {
    setJob(await getJob(jobId));
    setSteps(await getJobSteps(jobId));
    setStoryboard(await getStoryboard(jobId));
    setResult(await getJobResult(jobId));
  };
  load();
}, [jobId]);

return (
  <div>
    <JobStatusPanel job={job} steps={steps} />
    <StoryboardPreview storyboard={storyboard} />
    <VideoResultCard result={result} />
  </div>
);
```

- [ ] **Step 4: Run the frontend and validate the result-view checklist**

Run: `cd platform/frontend && npm run dev`
Expected: job detail shows status, storyboard area, and video result area.

- [ ] **Step 5: Commit the result-view frontend**

```bash
git add platform/frontend/src/components/platform/StoryboardPreview.jsx \
  platform/frontend/src/components/platform/AssetGallery.jsx \
  platform/frontend/src/components/platform/VideoResultCard.jsx \
  platform/frontend/src/api/jobs.js \
  platform/frontend/src/pages/JobDetail.jsx

git commit -m "feat: add storyboard and result frontend views"
```

## Task 11: Stabilize the basic path and document operational setup

**Files:**
- Modify: `platform/backend/app/services/tts_service.py`
- Modify: `platform/backend/app/services/video_service.py`
- Modify: `platform/backend/app/services/render_service.py`
- Modify: `platform/backend/README.md`
- Modify: `platform/frontend/README.md` if created during implementation, otherwise root docs note inside spec-adjacent docs
- Test: backend pytest suite, frontend manual smoke

- [ ] **Step 1: Add a stabilization checklist for the basic mode path**

```text
Release checklist:
1. Create a project from pdf
2. Create a project from cbz
3. Start a basic job
4. Confirm job and steps persist across refresh
5. Confirm storyboard endpoint returns structured content
6. Confirm result endpoint returns a final or placeholder video URL
```

- [ ] **Step 2: Implement minimum no-op safe services for TTS, video, and render orchestration**

```python
# app/services/tts_service.py
class TTSService:
    @staticmethod
    def generate(scene_text: str) -> dict:
        return {"audio_path": None, "duration": 4.0 if scene_text else 2.0}
```

```python
# app/services/video_service.py
class VideoService:
    @staticmethod
    def render_basic(scene: dict) -> dict:
        return {"clip_path": None, "render_mode": "basic", "duration": scene.get("duration", 4.0)}
```

```python
# app/services/render_service.py
class RenderService:
    @staticmethod
    def merge(clips: list[dict], audio_tracks: list[dict]) -> dict:
        return {"video_url": None, "clip_count": len(clips), "audio_count": len(audio_tracks)}
```

- [ ] **Step 3: Document local dev setup for the new platform skeleton**

```markdown
# backend README section
1. Set `DATABASE_URL` and `STORAGE_ROOT`
2. Install backend requirements
3. Start FastAPI
4. Start Celery worker
5. Use `/api/v1/projects` and `/api/v1/projects/{id}/jobs`
```

- [ ] **Step 4: Run the backend test suite and manual frontend smoke flow**

Run: `cd platform/backend && pytest tests -v`
Expected: PASS for implemented backend tests.

Run: `cd platform/frontend && npm run dev`
Expected: project upload, job creation, and job detail pages are reachable.

- [ ] **Step 5: Commit the stabilized v1 skeleton**

```bash
git add platform/backend/app/services/tts_service.py \
  platform/backend/app/services/video_service.py \
  platform/backend/app/services/render_service.py \
  platform/backend/README.md \
  platform/frontend/README.md

git commit -m "docs: stabilize and document comic video platform v1 skeleton"
```

## Self-Review Notes

### Spec coverage

Covered requirements:

- `pdf` and `cbz` uploads: Tasks 2 and 4
- project/job persistence: Tasks 1 to 3
- storyboard contract: Task 5
- resumable step tracking: Tasks 3 and 6
- frontend project/job/result views: Tasks 7 to 10
- stable `basic` path foundation: Task 11
- later AniSora integration boundary: Tasks 5, 6, 9, and 11 preserve adapter-based insertion points

Deferred intentionally but structurally prepared:

- real model adapters
- true TTS generation
- actual ffmpeg composition
- production AniSora service integration

### Placeholder scan

Intentional placeholders remain only where the plan explicitly calls for safe scaffolding for the v1 skeleton. Each placeholder is represented as a concrete no-op or minimal implementation rather than as a TODO marker.

### Type consistency

Core identifiers remain `project_id`, `job_id`, `asset_type`, `step_name`, `video_url`, and `storyboard` across backend and frontend tasks. Rendering modes remain `basic`, `hybrid`, and optional later `animated`.
