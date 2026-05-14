from .workers.pipeline_worker import run_job_pipeline
from .celery_app import celery_app
from .utils.ffmpeg_runtime import configure_pydub
import asyncio
import os
import json
import base64
import requests
import uuid
import io
from urllib.parse import urlparse

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

try:
    from groq import Groq
except ImportError:
    Groq = None

try:
    from .utils.pdf_utils import extract_pdf_images_high_quality
    from .utils.tts_utils import generate_narration_audio_with_provider
    from .utils.openai_utils import generate_cinematic_script
    from .services.model_config_service import DEFAULT_PROVIDER_FALLBACKS, ModelConfigService
    from .db.session import SessionLocal
    from .services.storage_service import StorageService
except ImportError:
    extract_pdf_images_high_quality = None
    generate_narration_audio_with_provider = None
    generate_cinematic_script = None
    ModelConfigService = None
    DEFAULT_PROVIDER_FALLBACKS = {}
    SessionLocal = None
    StorageService = None

configure_pydub()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if Groq and GROQ_API_KEY else None


async def upload_images_parallel(image_bytes, manga_folder):
    storage = StorageService()
    semaphore = asyncio.Semaphore(5)
    image_urls = [None] * len(image_bytes)
    loop = asyncio.get_running_loop()

    async def _upload(img, idx):
        async with semaphore:
            object_key = f"{manga_folder}/images/page_{idx:02d}.jpg"
            await loop.run_in_executor(None, storage.put_bytes, object_key, img, "image/jpeg")
            return idx, object_key

    tasks = [_upload(b, i) for i, b in enumerate(image_bytes)]
    results = await asyncio.gather(*tasks)

    for idx, url in results:
        image_urls[idx] = url
    return image_urls


def generate_visual_description_sync(image_bytes):
    try:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        prompt = "Describe this image in 1 energetic Hinglish sentence."

        if groq_client is None:
            return "Scene aage badhta hai..."

        chat_completion = groq_client.chat.completions.create(
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                ],
            }],
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            temperature=0.6,
            max_tokens=300,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception:
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


def _read_pdf_bytes(storage_ref: str) -> bytes:
    parsed = urlparse(storage_ref)
    if parsed.scheme in {"http", "https"}:
        response = requests.get(storage_ref, timeout=30)
        response.raise_for_status()
        return response.content
    return StorageService().get_bytes(storage_ref)


async def _process_task_async(task_id, manga_name, manga_genre, pdf_url):
    print(f"🚀 Starting Task: {task_id} | Manga: {manga_name}")

    try:
        pdf_bytes = _read_pdf_bytes(pdf_url)
        temp_pdf = f"/tmp/{uuid.uuid4()}.pdf"
        with open(temp_pdf, "wb") as file_handle:
            file_handle.write(pdf_bytes)

        images = extract_pdf_images_high_quality(temp_pdf)
        if not images:
            raise ValueError("No images extracted")

        image_bytes = []
        for img in images:
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=75, optimize=True)
            image_bytes.append(buffer.getvalue())

        str_id = str(task_id)
        manga_folder = f"{manga_name.replace(' ', '_').lower()}_{str_id[:8]}"
        image_urls = await upload_images_parallel(image_bytes, manga_folder)
        script_provider = _resolve_provider("script")
        tts_provider = _resolve_provider("tts")

        llm_output = generate_cinematic_script(
            manga_name,
            manga_genre,
            "",
            image_bytes[:4],
            provider_config=script_provider,
        )
        scenes = llm_output.get("scenes", [])

        if len(scenes) < len(image_urls):
            for index in range(len(scenes), len(image_urls)):
                scenes.append({
                    "narration_segment": generate_visual_description_sync(image_bytes[index]),
                    "image_page_index": index,
                    "duration": 4.0,
                })

        if AudioSegment is None:
            raise RuntimeError("Audio pipeline dependencies are not installed")

        merged_audio = AudioSegment.empty()
        final_scenes = []
        timeline = 0.0

        for scene in scenes:
            text = scene.get("narration_segment", "").strip()
            if text:
                path, duration = await generate_narration_audio_with_provider(text, tts_provider)
                merged_audio += AudioSegment.from_mp3(path)
            else:
                duration = 2.0
                merged_audio += AudioSegment.silent(duration=2000)

            scene["start_time"] = round(timeline, 2)
            scene["duration"] = round(duration, 2)
            timeline += duration
            final_scenes.append(scene)

        buffer = io.BytesIO()
        merged_audio.export(buffer, format="mp3")
        audio_url = StorageService().put_bytes(f"{manga_folder}/audio/audio.mp3", buffer.getvalue(), "audio/mpeg")

        final_result = {
            "task_id": task_id,
            "status": "SUCCESS",
            "manga_name": manga_name,
            "script_provider": script_provider,
            "tts_provider": tts_provider,
            "image_urls": image_urls,
            "audio_url": audio_url,
            "final_video_segments": final_scenes,
            "total_duration": round(timeline, 2),
        }
        result_key = f"{manga_folder}/artifacts/result.json"
        StorageService().put_bytes(result_key, json.dumps(final_result).encode("utf-8"), "application/json")
        print("✅ Legacy task completed with storage-backed result")
        return {"status": "ok", "result_key": result_key}
    finally:
        if "temp_pdf" in locals() and os.path.exists(temp_pdf):
            os.remove(temp_pdf)


@celery_app.task(bind=True, name="process_manga_pdf")
def process_manga_pdf_task(self, task_id, manga_name, manga_genre, pdf_url):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(_process_task_async(task_id, manga_name, manga_genre, pdf_url))
    finally:
        loop.close()


@celery_app.task(bind=True, name="run_job_pipeline")
def run_job_pipeline_task(self, job_id):
    return run_job_pipeline(job_id)
