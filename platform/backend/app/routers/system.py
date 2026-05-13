import os
import shutil

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import auth_is_enabled
from app.db.session import get_db
from app.services.model_config_service import ModelConfigService

router = APIRouter(prefix="/api/v1", tags=["system"])


@router.get("/health")
def health_check():
    return {"status": "ok"}


@router.get("/models")
def list_models(db: Session = Depends(get_db)):
    ffmpeg_path = shutil.which('ffmpeg')
    tesseract_path = shutil.which('tesseract')
    supabase_ready = bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY'))
    edge_tts_ready = True
    active_ocr = ModelConfigService.resolve_active_provider(db, "ocr")
    active_script = ModelConfigService.resolve_active_provider(db, "script")
    active_tts = ModelConfigService.resolve_active_provider(db, "tts")
    active_video = ModelConfigService.resolve_active_provider(db, "video")

    return {
        "ocr": {
            "available": bool(tesseract_path),
            "detail": tesseract_path or 'tesseract not found',
            "active_provider": active_ocr,
        },
        "script": {
            "available": True,
            "detail": active_script.get("model_name") or active_script.get("display_name") or 'legacy script pipeline',
            "active_provider": active_script,
        },
        "vision": {
            "available": True,
            "detail": 'local parse + storyboard pipeline',
        },
        "tts": {
            "available": edge_tts_ready,
            "detail": 'edge-tts with silent fallback',
            "active_provider": active_tts,
        },
        "video": {
            "available": True,
            "detail": 'opencv slideshow renderer',
            "active_provider": active_video,
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
        "auth": {
            "available": auth_is_enabled(),
            "detail": 'enabled' if auth_is_enabled() else 'disabled',
        },
    }
