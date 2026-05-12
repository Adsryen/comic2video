from __future__ import annotations

import asyncio
import shutil
import wave
from pathlib import Path

try:
    from pydub import AudioSegment
except ImportError:
    AudioSegment = None

from app.utils.tts_utils import generate_narration_audio


class AudioService:
    @staticmethod
    def synthesize_narration(segments: list[dict], output_dir: str | Path) -> dict:
        destination_dir = Path(output_dir)
        destination_dir.mkdir(parents=True, exist_ok=True)
        audio_path = destination_dir / "narration.wav"

        if AudioSegment is None:
            duration = AudioService._write_silent_wav(audio_path, max(len(segments) * 2, 1))
            return {"audio_path": str(audio_path), "duration": duration, "voice_mode": "silent_fallback", "segment_count": len(segments)}

        merged_audio = AudioSegment.empty()
        timeline = 0.0
        enriched_segments = []

        for segment in segments:
            text = (segment.get("text") or "").strip()
            if text:
                audio_file, duration = AudioService._generate_segment_audio(text, destination_dir)
                try:
                    clip = AudioSegment.from_file(audio_file)
                except Exception:
                    clip = AudioSegment.silent(duration=max(int(duration * 1000), 1000))
            else:
                duration = 2.0
                clip = AudioSegment.silent(duration=2000)

            merged_audio += clip
            segment_copy = dict(segment)
            segment_copy["start_time"] = round(timeline, 2)
            segment_copy["duration"] = round(duration, 2)
            timeline += duration
            enriched_segments.append(segment_copy)

        try:
            merged_audio.export(audio_path, format="wav")
            return {
                "audio_path": str(audio_path),
                "duration": round(timeline, 2),
                "voice_mode": "tts_or_silence_mix",
                "segment_count": len(enriched_segments),
                "segments": enriched_segments,
            }
        except Exception:
            duration = AudioService._write_silent_wav(audio_path, max(int(timeline), 1))
            return {
                "audio_path": str(audio_path),
                "duration": duration,
                "voice_mode": "wav_silent_fallback",
                "segment_count": len(enriched_segments),
                "segments": enriched_segments,
            }

    @staticmethod
    def merge_audio_with_video(video_path: str, audio_path: str, output_path: str) -> dict:
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)

        if shutil.which("ffmpeg"):
            import subprocess

            command = [
                "ffmpeg",
                "-y",
                "-i",
                video_path,
                "-i",
                audio_path,
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                str(destination),
            ]
            result = subprocess.run(command, capture_output=True, text=True)
            if result.returncode == 0 and destination.exists():
                return {"video_path": str(destination), "audio_path": audio_path, "muxed": True}

        Path(output_path).write_bytes(Path(video_path).read_bytes())
        return {"video_path": str(destination), "audio_path": audio_path, "muxed": False}

    @staticmethod
    def _generate_segment_audio(text: str, destination_dir: Path) -> tuple[str, float]:
        try:
            return asyncio.run(generate_narration_audio(text))
        except Exception:
            fallback = destination_dir / f"segment-{abs(hash(text))}.wav"
            duration = AudioService._write_silent_wav(fallback, 2)
            return str(fallback), duration

    @staticmethod
    def _write_silent_wav(path: str | Path, duration_seconds: int) -> float:
        destination = Path(path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        sample_rate = 16000
        frame_count = sample_rate * max(duration_seconds, 1)
        with wave.open(str(destination), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate)
            wav_file.writeframes(b"\x00\x00" * frame_count)
        return float(max(duration_seconds, 1))
