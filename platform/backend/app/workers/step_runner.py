from datetime import datetime

from app.db.models import JobStep


class StepRunner:
    @staticmethod
    def mark_running(session, step: JobStep):
        step.status = "RUNNING"
        step.started_at = datetime.utcnow()
        session.commit()

    @staticmethod
    def mark_completed(session, step: JobStep, output_json: str | None = None):
        step.status = "COMPLETED"
        if step.started_at is None:
            step.started_at = datetime.utcnow()
        step.finished_at = datetime.utcnow()
        step.output_json = output_json
        session.commit()

    @staticmethod
    def mark_failed(session, step: JobStep, error_message: str):
        step.status = "FAILED"
        if step.started_at is None:
            step.started_at = datetime.utcnow()
        step.finished_at = datetime.utcnow()
        step.error_message = error_message
        session.commit()
