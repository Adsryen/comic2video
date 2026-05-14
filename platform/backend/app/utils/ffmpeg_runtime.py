from __future__ import annotations

import os
import shutil
import warnings

from app.config import BASE_DIR

_FFMPEG_CANDIDATES = [
    os.getenv('FFMPEG_BINARY', '').strip(),
    os.getenv('FFMPEG_PATH', '').strip(),
    shutil.which('ffmpeg') or '',
    '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/mnt/c/ffmpeg/bin/ffmpeg.exe',
]

_FFPROBE_CANDIDATES = [
    os.getenv('FFPROBE_BINARY', '').strip(),
    os.getenv('FFPROBE_PATH', '').strip(),
    shutil.which('ffprobe') or '',
    '/usr/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    '/mnt/c/ffmpeg/bin/ffprobe.exe',
]


def _pick_existing(candidates: list[str]) -> str | None:
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return None


def get_ffmpeg_binary() -> str | None:
    return _pick_existing(_FFMPEG_CANDIDATES)


def get_ffprobe_binary() -> str | None:
    return _pick_existing(_FFPROBE_CANDIDATES)


def ffmpeg_available() -> bool:
    return get_ffmpeg_binary() is not None


def configure_pydub() -> None:
    warnings.filterwarnings(
        'ignore',
        message="Couldn't find ffmpeg or avconv - defaulting to ffmpeg, but may not work",
        category=RuntimeWarning,
        module='pydub.utils',
    )

    try:
        from pydub import AudioSegment
    except Exception:
        return

    ffmpeg_binary = get_ffmpeg_binary()
    ffprobe_binary = get_ffprobe_binary()

    if ffmpeg_binary:
        AudioSegment.converter = ffmpeg_binary
    if ffprobe_binary:
        AudioSegment.ffprobe = ffprobe_binary


def ffmpeg_detail() -> str:
    binary = get_ffmpeg_binary()
    if binary:
      return binary
    return 'ffmpeg not found; audio merge falls back to silent or video-only output'
