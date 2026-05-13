from .workers.pipeline_worker import run_job_pipeline
from .celery_app import celery_app
import asyncio
import os
import json
import base64
import requests
import uuid
import io
import traceback
try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    from supabase import create_client
except ImportError:
    create_client = None

# Import Utils
try:
    from .utils.supabase_utils import supabase_upload
    from .utils.pdf_utils import extract_pdf_images_high_quality
    from .utils.tts_utils import generate_narration_audio_with_provider
    from .utils.openai_utils import generate_cinematic_script
    from .services.model_config_service import DEFAULT_PROVIDER_FALLBACKS, ModelConfigService
    from .db.session import SessionLocal
except ImportError:
    supabase_upload = None
    extract_pdf_images_high_quality = None
    generate_narration_audio_with_provider = None
    generate_cinematic_script = None
    ModelConfigService = None
    DEFAULT_PROVIDER_FALLBACKS = {}
    SessionLocal = None

# -------------------------------------------------------------------
# 0. SETUP CLIENTS
# -------------------------------------------------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if Groq and GROQ_API_KEY else None
supabase = (
    create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    )
    if create_client and os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY"))
    else None
)

# -------------------------------------------------------------------
# 1. HELPER FUNCTIONS
# -------------------------------------------------------------------

async def upload_images_parallel(image_bytes, manga_folder):
    semaphore = asyncio.Semaphore(5)
    image_urls = [None] * len(image_bytes)
    loop = asyncio.get_running_loop()

    async def _upload(img, idx):
        async with semaphore:
            path = f"{manga_folder}/images/page_{idx:02d}.jpg"
            url = await loop.run_in_executor(None, supabase_upload, img, path, "image/jpeg")
            return idx, url

    tasks = [_upload(b, i) for i, b in enumerate(image_bytes)]
    results = await asyncio.gather(*tasks)
    
    for idx, url in results:
        image_urls[idx] = url
    return image_urls

def generate_visual_description_sync(image_bytes):
    try:
        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        prompt = "Describe this image in 1 energetic Hinglish sentence."
        
        if groq_client is None:
            return "Scene aage badhta hai..."

        chat_completion = groq_client.chat.completions.create(
            messages=[{
                "role": "user", 
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
                ]
            }],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.6,
            max_tokens=300,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"❌ Groq Vision Error: {e}")
        return "Scene aage badhta hai..."


def _resolve_provider(provider_type: str) -> dict:
    if ModelConfigService is None or SessionLocal is None:
        return DEFAULT_PROVIDER_FALLBACKS.get(provider_type, {"provider_key": provider_type})

    session = SessionLocal()
    try:
        return ModelConfigService.resolve_active_provider(session, provider_type)
    except Exception:
        return DEFAULT_PROVIDER_FALLBACKS.get(provider_type, {"provider_key": provider_type})
    finally:
        session.close()

# -------------------------------------------------------------------
# 2. ASYNC LOGIC
# -------------------------------------------------------------------
async def _process_task_async(task_id, manga_name, manga_genre, pdf_url):
    print(f"🚀 Starting Task: {task_id} | Manga: {manga_name}")
    
    try:
        # 1. Download PDF
        print("⬇️ Downloading PDF...")
        resp = requests.get(pdf_url)
        if resp.status_code != 200: raise ValueError("Failed to download PDF")

        temp_pdf = f"/tmp/{uuid.uuid4()}.pdf"
        with open(temp_pdf, "wb") as f:
            f.write(resp.content)

        # 2. Extract Images
        print("🖼️ Extracting Images...")
        images = extract_pdf_images_high_quality(temp_pdf)
        if not images: raise ValueError("No images extracted")

        image_bytes = []
        for img in images:
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=75, optimize=True)
            image_bytes.append(buf.getvalue())

        # 3. Upload Images
        str_id = str(task_id)
        manga_folder = f"{manga_name.replace(' ', '_').lower()}_{str_id[:8]}"
        image_urls = await upload_images_parallel(image_bytes, manga_folder)
        script_provider = _resolve_provider("script")
        tts_provider = _resolve_provider("tts")

        # 4. Generate Script
        print("📝 Generating Script...")
        llm_output = generate_cinematic_script(
            manga_name,
            manga_genre,
            "",
            image_bytes[:4],
            provider_config=script_provider,
        )
        scenes = llm_output.get("scenes", [])

        # 5. Backfill Scenes
        if len(scenes) < len(image_urls):
            print("⚠️ Filling missing scenes...")
            for i in range(len(scenes), len(image_urls)):
                desc = generate_visual_description_sync(image_bytes[i])
                scenes.append({
                    "narration_segment": desc,
                    "image_page_index": i,
                    "duration": 4.0
                })

        # 6. Generate Audio
        print("🎤 Generating Audio...")
        merged_audio = AudioSegment.empty()
        final_scenes = []
        timeline = 0.0

        for sc in scenes:
            text = sc.get("narration_segment", "").strip()
            if text:
                path, dur = await generate_narration_audio_with_provider(text, tts_provider)
                merged_audio += AudioSegment.from_mp3(path)
            else:
                dur = 2.0
                merged_audio += AudioSegment.silent(duration=2000)
            
            sc["start_time"] = round(timeline, 2)
            sc["duration"] = round(dur, 2)
            timeline += dur
            final_scenes.append(sc)

        # 7. Upload Audio
        buf = io.BytesIO()
        merged_audio.export(buf, format="mp3")
        audio_url = supabase_upload(buf.getvalue(), f"{manga_folder}/audio.mp3", "audio/mpeg")

        # 8. Save Result
        final_result = {
            "task_id": task_id,
            "status": "SUCCESS",
            "manga_name": manga_name,
            "script_provider": script_provider,
            "tts_provider": tts_provider,
            "image_urls": image_urls,
            "audio_url": audio_url,
            "final_video_segments": final_scenes,
            "total_duration": round(timeline, 2)
        }
        res_url = supabase_upload(json.dumps(final_result).encode(), f"{manga_folder}/result.json", "application/json")

        # 9. Update DB
        print("🔹 Updating Database...")
        supabase.table("jobs").update({
            "status": "SUCCESS",
            "result_url": res_url
        }).eq("id", task_id).execute()

        print("✅ Task Completed Successfully")
        return {"status": "ok"}

    except Exception as e:
        print(f"❌ Worker Failed: {e}")
        traceback.print_exc()
        if task_id:
            supabase.table("jobs").update({"status": "FAILED"}).eq("id", task_id).execute()
        raise e
    finally:
        if 'temp_pdf' in locals() and os.path.exists(temp_pdf):
            os.remove(temp_pdf)

# -------------------------------------------------------------------
# 3. CELERY TASK
# -------------------------------------------------------------------
@celery_app.task(bind=True, name="process_manga_pdf")
def process_manga_pdf_task(self, task_id, manga_name, manga_genre, pdf_url):
    """
    Celery Wrapper: Runs the async logic in a sync loop
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_process_task_async(task_id, manga_name, manga_genre, pdf_url))
    finally:
        loop.close()

@celery_app.task(bind=True, name="run_job_pipeline")
def run_job_pipeline_task(self, job_id):
    return run_job_pipeline(job_id)
