import os
import shutil

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import auth_is_enabled
from app.db.session import get_db
from app.services.model_config_service import ModelConfigService
from app.utils.ffmpeg_runtime import ffmpeg_available, ffmpeg_detail

router = APIRouter(prefix='/api/v1', tags=['system'])


@router.get('/health')
def health_check():
    return {'status': 'ok'}


@router.get('/models')
def list_models(db: Session = Depends(get_db)):
    tesseract_path = shutil.which('tesseract')
    storage_provider = os.getenv('STORAGE_PROVIDER', 'local')
    minio_ready = storage_provider == 'minio' and bool(os.getenv('MINIO_ENDPOINT') and os.getenv('MINIO_BUCKET'))
    active_ocr = ModelConfigService.resolve_active_provider(db, 'ocr')
    active_script = ModelConfigService.resolve_active_provider(db, 'script')
    active_tts = ModelConfigService.resolve_active_provider(db, 'tts')
    active_video = ModelConfigService.resolve_active_provider(db, 'video')

    return {
        'ocr': {
            'available': bool(tesseract_path),
            'detail': tesseract_path or 'tesseract not found',
            'active_provider': active_ocr,
        },
        'script': {
            'available': True,
            'detail': active_script.get('model_name') or active_script.get('display_name') or 'legacy script pipeline',
            'active_provider': active_script,
        },
        'vision': {
            'available': True,
            'detail': 'local parse + storyboard pipeline',
        },
        'tts': {
            'available': True,
            'detail': 'edge-tts with local fallback',
            'active_provider': active_tts,
        },
        'video': {
            'available': True,
            'detail': 'opencv slideshow renderer',
            'active_provider': active_video,
        },
        'ffmpeg': {
            'available': ffmpeg_available(),
            'detail': ffmpeg_detail(),
        },
        'storage': {
            'available': storage_provider == 'local' or minio_ready,
            'detail': f'{storage_provider} storage configured' if storage_provider == 'local' or minio_ready else f'{storage_provider} storage not fully configured',
            'provider': storage_provider,
        },
        'auth': {
            'available': auth_is_enabled(),
            'detail': 'enabled' if auth_is_enabled() else 'disabled',
        },
    }
