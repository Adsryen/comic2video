from datetime import datetime

from app.db.models import JobRun, JobStep, JobStepRun


class StepRunner:
    @staticmethod
    def mark_run_running(session, run: JobRun):
        run.status = "RUNNING"
        run.started_at = datetime.utcnow()
        session.commit()

    @staticmethod
    def mark_run_completed(session, run: JobRun):
        run.status = "COMPLETED"
        if run.started_at is None:
            run.started_at = datetime.utcnow()
        run.finished_at = datetime.utcnow()
        session.commit()

    @staticmethod
    def mark_run_failed(session, run: JobRun, error_message: str | None = None):
        run.status = "FAILED"
        if run.started_at is None:
            run.started_at = datetime.utcnow()
        run.finished_at = datetime.utcnow()
        session.commit()

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

    @staticmethod
    def mark_run_step_running(session, step_run: JobStepRun):
        step_run.status = "RUNNING"
        step_run.started_at = datetime.utcnow()
        session.commit()

    @staticmethod
    def mark_run_step_completed(session, step_run: JobStepRun, output_json: str | None = None):
        step_run.status = "COMPLETED"
        if step_run.started_at is None:
            step_run.started_at = datetime.utcnow()
        step_run.finished_at = datetime.utcnow()
        step_run.output_json = output_json
        session.commit()

    @staticmethod
    def mark_run_step_failed(session, step_run: JobStepRun, error_message: str):
        step_run.status = "FAILED"
        if step_run.started_at is None:
            step_run.started_at = datetime.utcnow()
        step_run.finished_at = datetime.utcnow()
        step_run.error_message = error_message
        session.commit()
