import json
import os
from datetime import datetime
from pathlib import Path

from app.config import BASE_DIR
from app.db.models import Asset, Job, JobStep, Project, Storyboard
from app.db.session import SessionLocal
from app.services.audio_service import AudioService
from app.services.parse_service import ParseService
from app.services.render_service import RenderService
from app.services.storyboard_service import StoryboardService
from app.workers.step_runner import StepRunner


def _storage_root() -> Path:
    root = os.getenv("STORAGE_ROOT", os.path.join(BASE_DIR, "storage"))
    path = Path(root)
    path.mkdir(parents=True, exist_ok=True)
    return path


def _write_json(relative_path: str, payload: dict) -> str:
    destination = _storage_root() / relative_path
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(destination)


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
    work_dir = _storage_root() / "projects" / project.id / "jobs" / job.id / "parse"
    extracted_dir = work_dir / "extracted"
    panels_dir = work_dir / "panels"

    page_items = ParseService.extract_pages(source_path, str(extracted_dir)) if source_path else []
    manifest = ParseService.build_panel_manifest(page_items, panels_dir)
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


def _build_script_output(context: dict, job: Job, project: Project) -> dict:
    storyboard_output = context.get("storyboard", {})
    scenes = storyboard_output.get("storyboard", {}).get("scenes", [])
    segments = [
        {
            "scene_index": scene["scene_index"],
            "text": scene.get("narration_text") or scene.get("subtitle_text") or f"Scene {scene['scene_index'] + 1}",
        }
        for scene in scenes
    ]
    return {
        "step": "script",
        "job_id": job.id,
        "project_id": project.id,
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


def _build_video_output(context: dict, job: Job, project: Project) -> dict:
    parse_output = context.get("parse", {})
    panel_items = parse_output.get("panel_items", [])
    video_path = _storage_root() / "projects" / project.id / "jobs" / job.id / "slideshow.mp4"
    render_result = RenderService.render_slideshow(
        [panel["storage_path"] for panel in panel_items],
        str(video_path),
    )
    return {
        "step": "video",
        "job_id": job.id,
        "project_id": project.id,
        "video_url": str(video_path),
        "scene_count": len(panel_items),
        "status": "rendered",
        **render_result,
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
    return {
        "step": "merge",
        "job_id": job.id,
        "project_id": project.id,
        "video_url": merge_result["video_path"],
        "audio_url": merge_result["audio_path"],
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
        return _build_script_output(context, job, project)
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
        db.add(
            Asset(
                project_id=project.id,
                job_id=job.id,
                asset_type="narration_audio",
                storage_path=output["audio_path"],
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
                storage_path=output["video_path"],
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
                storage_path=output["video_url"],
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
                f"projects/{job.project_id}/jobs/{job.id}/{step.step_name}.json",
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
