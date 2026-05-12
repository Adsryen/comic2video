import json
import os
import boto3
import random
from fastapi import APIRouter, Form, UploadFile, File, HTTPException
from ..utils.supabase_utils import supabase_upload 
from supabase import create_client

router = APIRouter()

# ---------------------------------------------------------
# 1. SETUP CLIENTS
# ---------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("❌ Missing SUPABASE_URL or SUPABASE_KEY env vars")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

sqs = boto3.client("sqs", region_name=os.environ.get("AWS_REGION", "eu-north-1"))
QUEUE_URL = os.environ.get("SQS_QUEUE_URL")

# ---------------------------------------------------------
# 2. GENERATE STORY ENDPOINT
# ---------------------------------------------------------
@router.post("/generate_audio_story")
async def start_generation(
    manga_name: str = Form(...),
    manga_genre: str = Form(...),
    manga_pdf: UploadFile = File(...)
):
    try:
        # A. Generate Random BigInt ID (Keep as Int for Python/DB)
        task_id = random.getrandbits(63)
        print(f"🆔 Generated Task ID (Int): {task_id}")

        # B. Upload PDF
        file_bytes = await manga_pdf.read()
        # Use str(task_id) for filename to be safe
        unique_filename = f"uploads/{str(task_id)}_{manga_name[:10].replace(' ', '_')}.pdf"
        
        pdf_url = supabase_upload(file_bytes, unique_filename, "application/pdf")

        # C. Create Database Entry
        new_job_data = {
            "id": task_id,            # ✅ Store as INT in DB
            "status": "PROCESSING",
            "manga_name": manga_name,
            "pdf_url": pdf_url,
            "created_at": "now()"
        }

        supabase.table("jobs").insert(new_job_data).execute()
        print("✅ Database Row Created")

        # D. Send to SQS
        message_body = {
            "task_id": task_id,       # ✅ Send as INT to Worker
            "manga_name": manga_name,
            "manga_genre": manga_genre,
            "pdf_url": pdf_url
        }

        sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message_body)
        )

        # E. [CRITICAL FIX] Return ID as STRING to Frontend
        # This prevents JavaScript from corrupting the large number
        return {
            "task_id": str(task_id),  # <--- FIXED: Send as "12345" string
            "message": "Job Queued Successfully",
            "status": "PROCESSING"
        }

    except Exception as e:
        print(f"❌ API Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------
# 3. STATUS CHECK ENDPOINT
# ---------------------------------------------------------
@router.get("/status/{task_id}")
async def get_status(task_id: str):
    try:
        # task_id comes as string from URL (safe)
        # We assume Supabase/Postgres handles the lookup correctly
        response = supabase.table("jobs").select("*").eq("id", task_id).execute()

        if not response.data:
            # Pass the 404 directly (don't wrap in 500)
            raise HTTPException(status_code=404, detail="Task not found")

        record = response.data[0]
        
        return {
            "task_id": str(record.get("id")), # Return as string
            "state": record.get("status"),
            "result": record.get("result_url"),
            "video": record.get("video_url")
        }

    except HTTPException as http_ex:
        raise http_ex  # Re-raise known HTTP errors (like 404)
    except Exception as e:
        print(f"❌ Status Check Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))