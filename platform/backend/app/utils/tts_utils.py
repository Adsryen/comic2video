"""
Ultra-Stable Neural TTS Generator (Edge-TTS)
---------------------------------------------------------
Optimized for:
 - Natural Human-like Voices (Microsoft Edge Neural)
 - Hinglish Support (hi-IN-MadhurNeural)
 - Async Execution
 - Accurate Duration Calculation
"""

import hashlib
import json
import os
import wave

import edge_tts
import requests
from pydub import AudioSegment

from app.config import TTS_CACHE_DIR
from app.services.model_config_service import DEFAULT_PROVIDER_FALLBACKS
from app.utils.ffmpeg_runtime import ffmpeg_available

VOICE = 'hi-IN-MadhurNeural'


def _provider_options(provider_config: dict | None) -> dict:
    if not provider_config:
        return {}

    raw = provider_config.get('config_json')
    if not raw:
        return {}

    if isinstance(raw, dict):
        return raw

    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}


def _duration(path: str) -> float:
    if not ffmpeg_available():
        return 0.0

    try:
        audio = AudioSegment.from_mp3(path)
        return round(len(audio) / 1000, 2)
    except Exception:
        return 0.0


async def generate_narration_audio(text: str) -> tuple[str, float]:
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)

    clean_text = ' '.join(text.split()).strip()
    if not clean_text:
        return '', 0.0

    text_hash = hashlib.md5(clean_text.encode()).hexdigest()
    final_path = os.path.join(TTS_CACHE_DIR, f'{text_hash}.mp3')

    if os.path.exists(final_path):
        dur = _duration(final_path)
        if dur > 0.2 or not ffmpeg_available():
            return final_path, max(dur, 1.0)
        try:
            os.remove(final_path)
        except OSError:
            pass

    try:
        communicate = edge_tts.Communicate(clean_text, VOICE)
        await communicate.save(final_path)
        dur = _duration(final_path)
        return final_path, max(dur, 1.0)
    except Exception:
        fallback = os.path.join(TTS_CACHE_DIR, f'{text_hash}_fallback.wav')
        AudioSegment.silent(duration=1000).export(fallback, format='wav')
        return fallback, 1.0


async def generate_narration_audio_with_provider(text: str, provider_config: dict | None = None) -> tuple[str, float]:
    provider = provider_config or DEFAULT_PROVIDER_FALLBACKS.get('tts', {})
    provider_key = provider.get('provider_key') or 'tts_local'
    options = _provider_options(provider)

    if provider_key in {'edge_tts', 'tts_local'}:
        global VOICE
        original_voice = VOICE
        voice = options.get('voice') or provider.get('model_name') or VOICE
        VOICE = voice
        try:
            return await generate_narration_audio(text)
        finally:
            VOICE = original_voice

    base_url = (provider.get('base_url') or '').rstrip('/')
    if not base_url:
        return await generate_narration_audio(text)

    endpoint = options.get('tts_endpoint', '/tts')
    timeout = options.get('timeout_seconds', 60)
    payload = {
        'text': text,
        'voice': options.get('voice') or provider.get('model_name'),
    }

    response = requests.post(f'{base_url}{endpoint}', json=payload, timeout=timeout)
    response.raise_for_status()

    text_hash = hashlib.md5((provider_key + text).encode()).hexdigest()
    output_format = options.get('response_format', 'wav')
    final_path = os.path.join(TTS_CACHE_DIR, f'{text_hash}.{output_format}')
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
    with open(final_path, 'wb') as handle:
        handle.write(response.content)

    if output_format == 'wav':
        with wave.open(final_path, 'rb') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate() or 1
            duration = round(frames / float(rate), 2)
    else:
        duration = _duration(final_path)

    return final_path, max(duration, 1.0)
