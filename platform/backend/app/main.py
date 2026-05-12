import os
import random
import asyncio
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

import app.db.models  # noqa: F401

try:
    from supabase import create_client
except ImportError:
    create_client = None

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)
app.include_router(projects_router)
app.include_router(jobs_router)
app.include_router(assets_router)
app.include_router(system_router)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = (
    create_client(SUPABASE_URL, SUPABASE_KEY)
    if create_client and SUPABASE_URL and SUPABASE_KEY
    else None
)

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
        if supabase is None:
            raise HTTPException(status_code=503, detail="Supabase is not configured")

        from app.worker import process_manga_pdf_task
        from app.utils.supabase_utils import supabase_upload

        # 1. Generate ID (Using your existing method)
        task_id = str(random.getrandbits(63))
        
        # 2. Upload PDF
        file_bytes = await manga_pdf.read()
        unique_filename = f"uploads/{task_id}_{manga_name[:10].replace(' ', '_')}.pdf"
        pdf_url = supabase_upload(file_bytes, unique_filename, "application/pdf")

        # 3. Create DB Entry (Status: QUEUED)
        supabase.table("jobs").insert({
            "id": task_id,
            "status": "QUEUED",
            "manga_name": manga_name,
            "pdf_url": pdf_url,
            "created_at": "now()"
        }).execute()

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
    if supabase is None or AsyncResult is None:
        raise HTTPException(status_code=503, detail="Status dependencies are not configured")

    from app.celery_app import celery_app

    # Optimization: Check Redis first for active status
    task_result = AsyncResult(task_id, app=celery_app)
    
    if task_result.state in ['PENDING', 'STARTED', 'RETRY']:
        return {"task_id": task_id, "state": "PROCESSING", "progress": "Working..."}
    
    # Fallback to Supabase for final result
    res = supabase.table("jobs").select("*").eq("id", task_id).execute()
    if not res.data: raise HTTPException(404, "Task not found")
    rec = res.data[0]
    
    return {
        "task_id": str(rec["id"]),
        "state": rec["status"],
        "result": rec.get("result_url")
    }