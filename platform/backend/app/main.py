import os
import random
import asyncio
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

if FRONTEND_BASE_URL and "://" in FRONTEND_BASE_URL:
    scheme, host = FRONTEND_BASE_URL.split("://", 1)
    if host.startswith("localhost:"):
        allowed_origins.append(f"{scheme}://127.0.0.1:{host.split(':', 1)[1]}")
    elif host.startswith("127.0.0.1:"):
        allowed_origins.append(f"{scheme}://localhost:{host.split(':', 1)[1]}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys(origin for origin in allowed_origins if origin)),
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(projects_router)
app.include_router(jobs_router)
app.include_router(assets_router)
app.include_router(system_router)
app.include_router(admin_model_configs_router)
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
