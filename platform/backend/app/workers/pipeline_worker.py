import json
import os
from datetime import datetime
from pathlib import Path

from app.config import BASE_DIR
from app.db.models import Asset, Job, JobStep, Project, Storyboard
from app.db.session import SessionLocal
from app.services.audio_service import AudioService
from app.services.model_config_service import ModelConfigService
from app.services.parse_service import ParseService
from app.services.render_service import RenderService
from app.services.storyboard_service import StoryboardService
from app.services.storage_service import StorageService
from app.utils.openai_utils import generate_cinematic_script
from app.workers.step_runner import StepRunner


def _storage_root() -> Path:
    root = os.getenv("STORAGE_ROOT", os.path.join(BASE_DIR, "storage"))
    path = Path(root)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _storage_service() -> StorageService:
    return StorageService(storage_root=os.getenv("STORAGE_ROOT", os.path.join(BASE_DIR, "storage")))


def _write_json(object_key: str, payload: dict) -> str:
    _storage_service().put_bytes(
        object_key,
        json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8"),
        "application/json",
    )
    return object_key


def _get_source_asset(db, project: Project):
    if project.source_asset_id:
        asset = db.query(Asset).filter(Asset.id == project.source_asset_id).first()
        if asset:
            return asset
    return (
        db.query(Asset)
        .filter(Asset.project_id == project.id, Asset.asset_type == "source_file")
        .order_by(Asset.created_at.desc())
        .first()
    )


def _build_parse_output(db, project: Project, job: Job) -> dict:
    source_asset = _get_source_asset(db, project)
    source_path = source_asset.storage_path if source_asset else ""
    source_file_path = _storage_root() / source_path if source_path else None
    work_dir = _storage_root() / "projects" / project.id / "jobs" / job.id / "parse"
    extracted_dir = work_dir / "extracted"
    panels_dir = work_dir / "panels"

    page_items = ParseService.extract_pages(str(source_file_path), str(extracted_dir)) if source_file_path else []
    manifest = ParseService.build_panel_manifest(page_items, panels_dir)
    storage = _storage_service()
    for panel in manifest.get("panel_items", []):
        local_panel_path = Path(panel["storage_path"])
        object_key = f"jobs/{job.id}/panels/{local_panel_path.name}"
        storage.put_bytes(object_key, local_panel_path.read_bytes(), panel.get("mime_type", "image/jpeg"))
        panel["local_path"] = str(local_panel_path)
        panel["storage_path"] = object_key
    manifest.update(
        {
            "step": "parse",
            "job_id": job.id,
            "project_id": project.id,
            "source_path": source_path,
            "source_type": project.source_type,
        }
    )
    return manifest


def _build_analyze_output(context: dict) -> dict:
    parse_output = context.get("parse", {})
    panel_items = parse_output.get("panel_items", [])
    combined_ocr = " ".join(item.get("ocr_text", "") for item in panel_items if item.get("ocr_text"))
    return {
        "summary": f"Detected {parse_output.get('panels', 0)} panels across {parse_output.get('pages', 0)} pages",
        "panels_detected": parse_output.get("panels", 0),
        "pages_detected": parse_output.get("pages", 0),
        "language": parse_output.get("language", "unknown"),
        "ocr_preview": combined_ocr[:280],
    }


def _build_storyboard_output(context: dict) -> dict:
    parse_output = context.get("parse", {})
    panel_items = parse_output.get("panel_items", [])
    storyboard = StoryboardService.build(panel_items)
    return {
        "storyboard": storyboard,
        "pages": parse_output.get("pages", 0),
        "panels": parse_output.get("panels", 0),
    }


def _load_panel_bytes(panel_items: list[dict], limit: int = 4) -> list[bytes]:
    image_bytes = []
    for panel in panel_items[:limit]:
        storage_path = panel.get("storage_path")
        if not storage_path:
            continue
        try:
            local_path = Path(storage_path)
            if local_path.exists():
                image_bytes.append(local_path.read_bytes())
                continue
            image_bytes.append(_storage_service().get_bytes(storage_path))
        except OSError:
            continue
        except Exception:
            continue
    return image_bytes


def _build_script_output(db, context: dict, job: Job, project: Project) -> dict:
    parse_output = context.get("parse", {})
    storyboard_output = context.get("storyboard", {})
    panel_items = parse_output.get("panel_items", [])
    scenes = storyboard_output.get("storyboard", {}).get("scenes", [])
    ocr_data = "\n".join(item.get("ocr_text", "") for item in panel_items if item.get("ocr_text"))
    provider = ModelConfigService.resolve_active_provider(db, "script")
    llm_output = generate_cinematic_script(
        manga_name=project.name,
        manga_genre=job.mode,
        ocr_data=ocr_data,
        image_bytes_list=_load_panel_bytes(panel_items),
        provider_config=provider,
        storyboard_scenes=scenes,
    )
    generated_scenes = llm_output.get("scenes", []) if isinstance(llm_output, dict) else []

    segments = [
        {
            "scene_index": scene["scene_index"],
            "text": (
                (generated_scenes[scene["scene_index"]].get("narration_segment") if scene["scene_index"] < len(generated_scenes) else None)
                or scene.get("narration_text")
                or scene.get("subtitle_text")
                or f"Scene {scene['scene_index'] + 1}"
            ),
        }
        for scene in scenes
    ]
    return {
        "step": "script",
        "job_id": job.id,
        "project_id": project.id,
        "provider": provider,
        "raw_output": llm_output,
        "segments": segments,
        "narration": " ".join(segment["text"] for segment in segments),
    }


def _build_tts_output(context: dict, job: Job, project: Project) -> dict:
    segments = context.get("script", {}).get("segments", [])
    audio_dir = _storage_root() / "projects" / project.id / "jobs" / job.id / "audio"
    audio_result = AudioService.synthesize_narration(segments, audio_dir)
    return {
        "step": "tts",
        "job_id": job.id,
        "project_id": project.id,
        **audio_result,
    }


def _video_render_options(provider: dict, job: Job) -> dict:
    options = {}
    raw = provider.get("config_json") if provider else None
    if raw:
        try:
            options = json.loads(raw) if isinstance(raw, str) else dict(raw)
        except (TypeError, json.JSONDecodeError):
            options = {}

    width = int(options.get("width", 1280))
    height = int(options.get("height", 720))
    fps = int(options.get("fps", 24))
    seconds_per_panel = float(options.get("seconds_per_panel", options.get("scene_duration", 2.0)))
    background_rgb = tuple(options.get("background_rgb", [10, 10, 14]))

    return {
        "fps": fps,
        "frame_size": (width, height),
        "seconds_per_panel": seconds_per_panel,
        "background_rgb": background_rgb,
        "provider_key": provider.get("provider_key") if provider else "video_local",
        "mode": job.mode,
    }


def _resolve_video_provider() -> dict:
    session = SessionLocal()
    try:
        return ModelConfigService.resolve_active_provider(session, "video")
    finally:
        session.close()


def _build_video_output(context: dict, job: Job, project: Project) -> dict:
    parse_output = context.get("parse", {})
    panel_items = parse_output.get("panel_items", [])
    video_path = _storage_root() / "projects" / project.id / "jobs" / job.id / "slideshow.mp4"
    provider = _resolve_video_provider()
    render_options = _video_render_options(provider, job)
    panel_paths = [panel.get("local_path") or panel["storage_path"] for panel in panel_items]
    render_result = RenderService.render_slideshow(
        panel_paths,
        str(video_path),
        seconds_per_panel=render_options["seconds_per_panel"],
        fps=render_options["fps"],
        frame_size=render_options["frame_size"],
        background_rgb=render_options["background_rgb"],
    )
    object_key = f"jobs/{job.id}/video/slideshow.mp4"
    _storage_service().put_bytes(object_key, Path(video_path).read_bytes(), "video/mp4")
    render_metadata = {
        key: value
        for key, value in render_result.items()
        if key not in {"video_path", "fps", "width", "height", "seconds_per_panel", "background_rgb"}
    }
    return {
        "step": "video",
        "job_id": job.id,
        "project_id": project.id,
        "video_url": object_key,
        "video_path": str(video_path),
        "video_storage_path": object_key,
        "scene_count": len(panel_items),
        "status": "rendered",
        "provider": provider,
        "render_options": {
            "fps": render_options["fps"],
            "width": render_options["frame_size"][0],
            "height": render_options["frame_size"][1],
            "seconds_per_panel": render_options["seconds_per_panel"],
            "background_rgb": list(render_options["background_rgb"]),
        },
        **render_metadata,
    }


def _build_merge_output(context: dict, job: Job, project: Project) -> dict:
    video_output = context.get("video", {})
    tts_output = context.get("tts", {})
    final_path = _storage_root() / "projects" / project.id / "jobs" / job.id / "final_video.mp4"
    merge_result = AudioService.merge_audio_with_video(
        video_output["video_path"],
        tts_output["audio_path"],
        str(final_path),
    )
    final_video_key = f"jobs/{job.id}/video/final_video.mp4"
    final_audio_key = f"jobs/{job.id}/audio/final_audio.wav"
    _storage_service().put_bytes(final_video_key, Path(merge_result["video_path"]).read_bytes(), "video/mp4")
    if Path(merge_result["audio_path"]).exists():
        _storage_service().put_bytes(final_audio_key, Path(merge_result["audio_path"]).read_bytes(), "audio/wav")
    return {
        "step": "merge",
        "job_id": job.id,
        "project_id": project.id,
        "video_url": final_video_key,
        "video_path": str(final_path),
        "video_storage_path": final_video_key,
        "audio_url": final_audio_key,
        "audio_path": merge_result["audio_path"],
        "audio_storage_path": final_audio_key,
        "muxed": merge_result["muxed"],
    }


def _step_output(step_name: str, db, project: Project, job: Job, context: dict) -> dict:
    if step_name == "parse":
        return _build_parse_output(db, project, job)
    if step_name == "analyze":
        return _build_analyze_output(context)
    if step_name == "storyboard":
        return _build_storyboard_output(context)
    if step_name == "script":
        return _build_script_output(db, context, job, project)
    if step_name == "tts":
        return _build_tts_output(context, job, project)
    if step_name == "video":
        return _build_video_output(context, job, project)
    if step_name == "merge":
        return _build_merge_output(context, job, project)
    return {"step": step_name, "job_id": job.id, "project_id": project.id}


def _persist_step_assets(db, step: JobStep, project: Project, job: Job, output: dict, artifact_path: str):
    if step.step_name == "parse":
        for panel in output.get("panel_items", []):
            db.add(
                Asset(
                    project_id=project.id,
                    job_id=job.id,
                    asset_type="panel_image",
                    storage_path=panel["storage_path"],
                    mime_type=panel.get("mime_type", "image/jpeg"),
                    metadata_json=json.dumps(
                        {
                            "panel_id": panel["panel_id"],
                            "page_index": panel["page_index"],
                            "panel_index": panel["panel_index"],
                        }
                    ),
                )
            )

        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="parse_artifact",
                storage_path=artifact_path,
                mime_type="application/json",
                metadata_json=json.dumps({"step": step.step_name}),
            )
        )
        db.commit()
        return

    if step.step_name == "storyboard":
        storyboard_payload = output["storyboard"]
        db.add(
            Storyboard(
                project_id=project.id,
                job_id=job.id,
                version=1,
                content_json=json.dumps(storyboard_payload),
            )
        )
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="storyboard",
                storage_path=artifact_path,
                mime_type="application/json",
                metadata_json=json.dumps({"step": step.step_name}),
            )
        )
        db.commit()
        return

    if step.step_name == "tts":
        audio_path = output.get("audio_path")
        audio_storage_path = output.get("audio_storage_path")
        if not audio_storage_path and audio_path and not str(audio_path).startswith(("jobs/", "projects/")):
            audio_file = Path(audio_path)
            if audio_file.exists():
                audio_storage_path = f"jobs/{job.id}/audio/narration.wav"
                _storage_service().put_bytes(audio_storage_path, audio_file.read_bytes(), "audio/wav")
                output["audio_storage_path"] = audio_storage_path
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="narration_audio",
                storage_path=output.get("audio_storage_path", output["audio_path"]),
                mime_type="audio/wav",
                metadata_json=json.dumps(output),
            )
        )
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="tts_artifact",
                storage_path=artifact_path,
                mime_type="application/json",
                metadata_json=json.dumps({"step": step.step_name}),
            )
        )
        db.commit()
        return

    if step.step_name == "video":
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="video_artifact",
                storage_path=output.get("video_storage_path", output["video_path"]),
                mime_type="video/mp4",
                metadata_json=json.dumps(output),
            )
        )
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="video_artifact_meta",
                storage_path=artifact_path,
                mime_type="application/json",
                metadata_json=json.dumps({"step": step.step_name}),
            )
        )
        db.commit()
        return

    if step.step_name == "merge":
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="final_video",
                storage_path=output.get("video_storage_path", output["video_url"]),
                mime_type="video/mp4",
                metadata_json=json.dumps(output),
            )
        )
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="merge_artifact",
                storage_path=artifact_path,
                mime_type="application/json",
                metadata_json=json.dumps({"step": step.step_name}),
            )
        )
        db.commit()
        return

    db.add(
        Asset(
            project_id=project.id,
            job_id=job.id,
            asset_type=f"{step.step_name}_artifact",
            storage_path=artifact_path,
            mime_type="application/json",
            metadata_json=json.dumps(output),
        )
    )
    db.commit()


def run_job_pipeline(job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return {"status": "missing", "job_id": job_id}

        project = db.query(Project).filter(Project.id == job.project_id).first()
        if not project:
            return {"status": "missing_project", "job_id": job_id}

        job.status = "RUNNING"
        job.started_at = datetime.utcnow()
        db.commit()

        steps = db.query(JobStep).filter(JobStep.job_id == job_id).all()
        total_steps = len(steps) or 1
        context: dict[str, dict] = {}

        for index, step in enumerate(steps, start=1):
            if step.status != "PENDING":
                continue

            StepRunner.mark_running(db, step)
            output = _step_output(step.step_name, db, project, job, context)
            context[step.step_name] = output

            artifact_path = _write_json(
                f"jobs/{job.id}/artifacts/{step.step_name}.json",
                output,
            )

            _persist_step_assets(db, step, project, job, output, artifact_path)
            StepRunner.mark_completed(db, step, json.dumps(output))
            job.progress = int(index / total_steps * 100)
            db.commit()

        job.status = "COMPLETED"
        job.progress = 100
        job.finished_at = datetime.utcnow()
        db.commit()
        return {"status": "ok", "job_id": job_id}
    finally:
        db.close()
