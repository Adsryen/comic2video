import os
import shutil

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/models")
def list_models():
    ffmpeg_path = shutil.which('ffmpeg')
    tesseract_path = shutil.which('tesseract')
    supabase_ready = bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
    edge_tts_ready = True

    return {
        "ocr": {
            "available": bool(tesseract_path),
            "detail": tesseract_path or 'tesseract not found',
        },
        "vision": {
            "available": True,
            "detail": 'local parse + storyboard pipeline',
        },
        "tts": {
            "available": edge_tts_ready,
            "detail": 'edge-tts with silent fallback',
        },
        "video": {
            "available": True,
            "detail": 'opencv slideshow renderer',
        },
        "ffmpeg": {
            "available": bool(ffmpeg_path),
            "detail": ffmpeg_path or 'ffmpeg not found; merge falls back to video-only output',
        },
        "storage": {
            "available": True,
            "detail": 'local filesystem storage',
        },
        "supabase": {
            "available": supabase_ready,
            "detail": 'configured' if supabase_ready else 'not configured',
        },
    }
