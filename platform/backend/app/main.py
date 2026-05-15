import os
import random
import asyncio
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.config import FRONTEND_BASE_URL
from app.utils.ffmpeg_runtime import configure_pydub
try:
    from celery.result import AsyncResult
except ImportError:
    AsyncResult = None

# Import Celery stuff
from app.db.base import Base
from app.db.session import engine
from app.routers.projects import router as projects_router
from app.routers.jobs import router as jobs_router
from app.routers.assets import router as assets_router
from app.routers.system import router as system_router
from app.routers.admin_model_configs import router as admin_model_configs_router
from app.routers.admin_model_vendor_mappings import router as admin_model_vendor_mappings_router
from app.routers.auth import router as auth_router
from app.routers.users import router as users_router
from app.services.bootstrap_service import BootstrapService
from app.db.session import SessionLocal

import app.db.models  # noqa: F401

configure_pydub()

app = FastAPI()

allowed_origins = [
    FRONTEND_BASE_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://0.0.0.0:5173",
]

extra_frontend_origins = os.getenv("FRONTEND_EXTRA_ORIGINS", "")
if extra_frontend_origins:
    allowed_origins.extend([origin.strip() for origin in extra_frontend_origins.split(",") if origin.strip()])

if FRONTEND_BASE_URL and "://" in FRONTEND_BASE_URL:
    scheme, host = FRONTEND_BASE_URL.split("://", 1)
    if host.startswith("localhost:"):
        allowed_origins.append(f"{scheme}://127.0.0.1:{host.split(':', 1)[1]}")
    elif host.startswith("127.0.0.1:"):
        allowed_origins.append(f"{scheme}://localhost:{host.split(':', 1)[1]}")
    elif ":" in host:
        port = host.split(":", 1)[1]
        bare_host = host.split(":", 1)[0]
        allowed_origins.extend([
            f"{scheme}://localhost:{port}",
            f"{scheme}://127.0.0.1:{port}",
            f"{scheme}://0.0.0.0:{port}",
            f"{scheme}://{bare_host}:{port}",
        ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(origin for origin in allowed_origins if origin)),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


def ensure_schema_compatibility():
    inspector = inspect(engine)
    statements = []
    table_names = inspector.get_table_names()

    if "model_providers" in table_names:
        columns = {column["name"] for column in inspector.get_columns("model_providers")}
        if "last_tested_at" not in columns:
            statements.append("ALTER TABLE model_providers ADD COLUMN last_tested_at DATETIME")
        if "auth_type" not in columns:
            statements.append("ALTER TABLE model_providers ADD COLUMN auth_type VARCHAR(50)")
        if "api_key" not in columns:
            statements.append("ALTER TABLE model_providers ADD COLUMN api_key TEXT")

    if "model_vendors" in table_names:
        columns = {column["name"] for column in inspector.get_columns("model_vendors")}
        if "last_test_status" not in columns:
            statements.append("ALTER TABLE model_vendors ADD COLUMN last_test_status VARCHAR(20)")
        if "last_test_message" not in columns:
            statements.append("ALTER TABLE model_vendors ADD COLUMN last_test_message TEXT")
        if "discovered_models_json" not in columns:
            statements.append("ALTER TABLE model_vendors ADD COLUMN discovered_models_json TEXT")
        if "discovered_models_at" not in columns:
            statements.append("ALTER TABLE model_vendors ADD COLUMN discovered_models_at DATETIME")

    if "model_vendors" not in table_names:
        statements.append(
            "CREATE TABLE model_vendors (id VARCHAR(36) PRIMARY KEY, vendor_key VARCHAR(100) NOT NULL, display_name VARCHAR(255) NOT NULL, base_url TEXT, auth_type VARCHAR(50), api_key TEXT, config_json TEXT, is_enabled BOOLEAN NOT NULL DEFAULT 1, last_tested_at DATETIME, last_test_status VARCHAR(20), last_test_message TEXT, discovered_models_json TEXT, discovered_models_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL)"
        )

    if "capability_model_mappings" not in table_names:
        statements.append(
            "CREATE TABLE capability_model_mappings (id VARCHAR(36) PRIMARY KEY, capability_type VARCHAR(50) NOT NULL, vendor_id VARCHAR(36) NOT NULL, model_name VARCHAR(255), display_name VARCHAR(255) NOT NULL, is_enabled BOOLEAN NOT NULL DEFAULT 1, is_default BOOLEAN NOT NULL DEFAULT 0, config_json TEXT, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY(vendor_id) REFERENCES model_vendors(id))"
        )

    if "job_runs" not in table_names:
        statements.append(
            "CREATE TABLE job_runs (id VARCHAR(36) PRIMARY KEY, job_id VARCHAR(36) NOT NULL, run_type VARCHAR(50) NOT NULL DEFAULT 'initial', status VARCHAR(50) NOT NULL DEFAULT 'PENDING', triggered_by_user_id VARCHAR(36), source_run_id VARCHAR(36), resume_from_step_name VARCHAR(50), started_at DATETIME, finished_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY(job_id) REFERENCES jobs(id), FOREIGN KEY(triggered_by_user_id) REFERENCES users(id), FOREIGN KEY(source_run_id) REFERENCES job_runs(id))"
        )

    if "job_step_runs" not in table_names:
        statements.append(
            "CREATE TABLE job_step_runs (id VARCHAR(36) PRIMARY KEY, job_run_id VARCHAR(36) NOT NULL, job_id VARCHAR(36) NOT NULL, step_name VARCHAR(50) NOT NULL, attempt_no INTEGER NOT NULL DEFAULT 1, status VARCHAR(50) NOT NULL DEFAULT 'PENDING', input_json TEXT, output_json TEXT, error_message TEXT, reused_from_step_run_id VARCHAR(36), started_at DATETIME, finished_at DATETIME, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL, FOREIGN KEY(job_run_id) REFERENCES job_runs(id), FOREIGN KEY(job_id) REFERENCES jobs(id), FOREIGN KEY(reused_from_step_run_id) REFERENCES job_step_runs(id))"
        )

    if "assets" in table_names:
        columns = {column["name"] for column in inspector.get_columns("assets")}
        if "job_run_id" not in columns:
            statements.append("ALTER TABLE assets ADD COLUMN job_run_id VARCHAR(36)")
        if "job_step_run_id" not in columns:
            statements.append("ALTER TABLE assets ADD COLUMN job_step_run_id VARCHAR(36)")
        if "step_name" not in columns:
            statements.append("ALTER TABLE assets ADD COLUMN step_name VARCHAR(50)")
        if "version" not in columns:
            statements.append("ALTER TABLE assets ADD COLUMN version INTEGER NOT NULL DEFAULT 1")
        if "is_latest" not in columns:
            statements.append("ALTER TABLE assets ADD COLUMN is_latest BOOLEAN NOT NULL DEFAULT 1")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


ensure_schema_compatibility()

app.include_router(projects_router)
app.include_router(jobs_router)
app.include_router(assets_router)
app.include_router(system_router)
app.include_router(admin_model_configs_router)
app.include_router(admin_model_vendor_mappings_router)
app.include_router(auth_router)
app.include_router(users_router)


@app.on_event("startup")
def bootstrap_local_admin():
    session = SessionLocal()
    try:
        BootstrapService.ensure_local_admin(session)
    finally:
        session.close()


@app.get("/")
def home():
    return {"status": "Manhwa AI Running on Hugging Face (RabbitMQ + Redis)"}

@app.post("/api/v1/generate_audio_story")
async def start_generation(
    manga_name: str = Form(...),
    manga_genre: str = Form(...),
    manga_pdf: UploadFile = File(...)
):
    try:
        from app.worker import process_manga_pdf_task
        from app.services.storage_service import StorageService

        # 1. Generate ID (Using your existing method)
        task_id = str(random.getrandbits(63))
        
        # 2. Upload PDF
        file_bytes = await manga_pdf.read()
        unique_filename = f"uploads/{task_id}_{manga_name[:10].replace(' ', '_')}.pdf"
        pdf_url = StorageService().put_bytes(unique_filename, file_bytes, "application/pdf")

        # 4. ⚡ Dispatch to RabbitMQ (Optimization)
        process_manga_pdf_task.apply_async(
            args=[task_id, manga_name, manga_genre, pdf_url],
            task_id=task_id
        )

        return {"task_id": task_id, "status": "QUEUED"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/status/{task_id}")
def get_status(task_id: str):
    if AsyncResult is None:
        raise HTTPException(status_code=503, detail="Status dependencies are not configured")

    from app.celery_app import celery_app

    # Optimization: Check Redis first for active status
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state in ['PENDING', 'STARTED', 'RETRY']:
        return {"task_id": task_id, "state": "PROCESSING", "progress": "Working..."}
    
    raise HTTPException(status_code=501, detail="Legacy external status lookup is not supported in local storage mode")
