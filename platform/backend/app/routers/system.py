import os
import shutil

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import auth_is_enabled
from app.db.session import get_db
from app.services.model_config_service import ModelConfigService
from app.utils.ffmpeg_runtime import ffmpeg_available, ffmpeg_detail

router = APIRouter(prefix='/api/v1', tags=['system'])


def _provider_tested(provider: dict | None) -> bool:
    return bool(provider and provider.get('id') and provider.get('last_tested_at'))


def _provider_name(provider: dict | None, fallback: str) -> str:
    if not provider:
        return fallback
    return provider.get('display_name') or provider.get('model_name') or fallback


def _provider_model(provider: dict | None) -> str | None:
    if not provider:
        return None
    return provider.get('model_name') or provider.get('display_name') or None


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

    ocr_provider_tested = _provider_tested(active_ocr)
    script_provider_tested = _provider_tested(active_script)
    tts_provider_tested = _provider_tested(active_tts)
    video_provider_tested = _provider_tested(active_video)

    return {
        'ocr': {
            'available': bool(tesseract_path) and ocr_provider_tested,
            'tested': ocr_provider_tested,
            'detail': _provider_name(active_ocr, tesseract_path or 'tesseract not found') if ocr_provider_tested else (tesseract_path or 'tesseract not found'),
            'reason': None if bool(tesseract_path) and ocr_provider_tested else ('provider not tested yet' if tesseract_path else 'tesseract not found'),
            'active_provider': active_ocr,
            'current_model': _provider_model(active_ocr),
        },
        'script': {
            'available': script_provider_tested,
            'tested': script_provider_tested,
            'detail': _provider_name(active_script, 'legacy script pipeline') if script_provider_tested else 'provider not tested yet',
            'reason': None if script_provider_tested else 'provider not tested yet',
            'active_provider': active_script,
            'current_model': _provider_model(active_script),
        },
        'vision': {
            'available': True,
            'detail': 'local parse + storyboard pipeline',
        },
        'tts': {
            'available': tts_provider_tested,
            'tested': tts_provider_tested,
            'detail': _provider_name(active_tts, 'edge-tts with local fallback') if tts_provider_tested else 'provider not tested yet',
            'reason': None if tts_provider_tested else 'provider not tested yet',
            'active_provider': active_tts,
            'current_model': _provider_model(active_tts),
        },
        'video': {
            'available': video_provider_tested,
            'tested': video_provider_tested,
            'detail': _provider_name(active_video, 'opencv slideshow renderer') if video_provider_tested else 'provider not tested yet',
            'reason': None if video_provider_tested else 'provider not tested yet',
            'active_provider': active_video,
            'current_model': _provider_model(active_video),
        },
        'ffmpeg': {
            'available': ffmpeg_available(),
            'detail': ffmpeg_detail(),
            'tested': ffmpeg_available(),
            'reason': None if ffmpeg_available() else ffmpeg_detail(),
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
