"""
Ultra-Stable Neural TTS Generator (Edge-TTS)
---------------------------------------------------------
Optimized for:
 - Natural Human-like Voices (Microsoft Edge Neural)
 - Hinglish Support (hi-IN-MadhurNeural)
 - Async Execution
 - Accurate Duration Calculation
"""

import os
import hashlib
import json
import shutil
import wave

import requests
import edge_tts
from pydub import AudioSegment
from app.config import TTS_CACHE_DIR
from app.services.model_config_service import DEFAULT_PROVIDER_FALLBACKS

# ============================================================
# CONFIGURATION
# ============================================================
# Best voice for Hinglish: "hi-IN-MadhurNeural"
# Best voice for English: "en-US-ChristopherNeural"
VOICE = "hi-IN-MadhurNeural" 


def _provider_options(provider_config: dict | None) -> dict:
    if not provider_config:
        return {}

    raw = provider_config.get("config_json")
    if not raw:
        return {}

    if isinstance(raw, dict):
        return raw

    try:
        return json.loads(raw)
    except (TypeError, json.JSONDecodeError):
        return {}

# ============================================================
# 1. FFmpeg Safety Check
# ============================================================
def _assert_ffmpeg_exists():
    if not shutil.which("ffmpeg"):
        raise EnvironmentError("❌ FFmpeg not found! Please install it.")

# ============================================================
# 2. Get Audio Duration Safely
# ============================================================
def _duration(path: str) -> float:
    try:
        audio = AudioSegment.from_mp3(path)
        return round(len(audio) / 1000, 2)
    except:
        return 0.0

# ============================================================
# 3. MAIN FUNCTION — Neural TTS (Async)
# ============================================================
async def generate_narration_audio(text: str) -> tuple[str, float]:
    """
    Generates high-quality Neural audio.
    NOTE: This is now an ASYNC function.
    """
    _assert_ffmpeg_exists()
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)

    # Clean text
    clean_text = " ".join(text.split()).strip()
    if not clean_text:
        return "", 0.0

    # Cache Key
    text_hash = hashlib.md5(clean_text.encode()).hexdigest()
    final_path = os.path.join(TTS_CACHE_DIR, f"{text_hash}.mp3")

    # ------------------------------------------------------------
    # CHECK CACHE
    # ------------------------------------------------------------
    if os.path.exists(final_path):
        dur = _duration(final_path)
        if dur > 0.2:
            print(f"✔ Cached Neural Audio ({dur}s)")
            return final_path, dur
        else:
            try:
                os.remove(final_path)
            except:
                pass

    # ------------------------------------------------------------
    # GENERATE NEW AUDIO (Edge TTS)
    # ------------------------------------------------------------
    print(f"🎤 Generating Neural TTS ({len(clean_text)} chars)...")
    
    try:
        communicate = edge_tts.Communicate(clean_text, VOICE)
        await communicate.save(final_path)

        dur = _duration(final_path)
        print(f"✔ Final TTS generated → {dur}s")
        return final_path, dur

    except Exception as e:
        print(f"❌ EdgeTTS Failed: {e}")
        # Fallback to silence if generation fails
        fallback = os.path.join(TTS_CACHE_DIR, f"{text_hash}_fallback.mp3")
        AudioSegment.silent(duration=1000).export(fallback, format="mp3")
        return fallback, 1.0


async def generate_narration_audio_with_provider(text: str, provider_config: dict | None = None) -> tuple[str, float]:
    provider = provider_config or DEFAULT_PROVIDER_FALLBACKS.get("tts", {})
    provider_key = provider.get("provider_key") or "tts_local"
    options = _provider_options(provider)

    if provider_key in {"edge_tts", "tts_local"}:
        global VOICE
        original_voice = VOICE
        voice = options.get("voice") or provider.get("model_name") or VOICE
        VOICE = voice
        try:
            return await generate_narration_audio(text)
        finally:
            VOICE = original_voice

    base_url = (provider.get("base_url") or "").rstrip("/")
    if not base_url:
        return await generate_narration_audio(text)

    endpoint = options.get("tts_endpoint", "/tts")
    timeout = options.get("timeout_seconds", 60)
    payload = {
        "text": text,
        "voice": options.get("voice") or provider.get("model_name"),
    }

    response = requests.post(f"{base_url}{endpoint}", json=payload, timeout=timeout)
    response.raise_for_status()

    text_hash = hashlib.md5((provider_key + text).encode()).hexdigest()
    output_format = options.get("response_format", "wav")
    final_path = os.path.join(TTS_CACHE_DIR, f"{text_hash}.{output_format}")
    os.makedirs(TTS_CACHE_DIR, exist_ok=True)
    with open(final_path, "wb") as output_file:
        output_file.write(response.content)

    if output_format == "mp3":
        duration = _duration(final_path)
    else:
        try:
            with wave.open(final_path, "rb") as wav_file:
                duration = round(wav_file.getnframes() / float(wav_file.getframerate()), 2)
        except Exception:
            duration = 0.0

    if duration <= 0:
        return await generate_narration_audio(text)

    return final_path, duration
