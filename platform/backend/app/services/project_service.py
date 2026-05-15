from sqlalchemy.orm import Session

from app.db.models import Asset, Job, Project


class ProjectService:
    @staticmethod
    def create(session: Session, name: str, source_type: str, created_by_user_id: str | None = None) -> Project:
        project = Project(name=name, source_type=source_type, status="UPLOADED", created_by_user_id=created_by_user_id)
        session.add(project)
        session.flush()
        return project

    @staticmethod
    def list_all(session: Session) -> list[Project]:
        return session.query(Project).order_by(Project.created_at.desc()).all()

    @staticmethod
    def list_non_empty(session: Session) -> list[Project]:
        return (
            session.query(Project)
            .join(Asset, Asset.project_id == Project.id)
            .filter(Asset.asset_type == "source_file")
            .distinct(Project.id)
            .order_by(Project.created_at.desc())
            .all()
        )

    @staticmethod
    def get_by_id(session: Session, project_id: str) -> Project | None:
        return session.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def delete_empty_projects(session: Session, created_by_user_id: str | None = None) -> int:
        projects = session.query(Project).all()
        deleted = 0
        for project in projects:
            if created_by_user_id is not None and project.created_by_user_id != created_by_user_id:
                continue
            has_source_file = (
                session.query(Asset.id)
                .filter(Asset.project_id == project.id, Asset.asset_type == "source_file")
                .first()
                is not None
            )
            has_jobs = session.query(Job.id).filter(Job.project_id == project.id).first() is not None
            if has_source_file or has_jobs:
                continue
            session.delete(project)
            deleted += 1
        if deleted:
            session.commit()
        return deleted

    @staticmethod
    def list_assets(session: Session, project_id: str) -> list[Asset]:
        return (
            session.query(Asset)
            .filter(Asset.project_id == project_id)
            .order_by(Asset.created_at.desc())
            .all()
        )

    @staticmethod
    def list_jobs(session: Session, project_id: str) -> list[Job]:
        return (
            session.query(Job)
            .filter(Job.project_id == project_id)
            .order_by(Job.created_at.desc())
            .all()
        )
