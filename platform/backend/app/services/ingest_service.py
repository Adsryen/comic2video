import os

from sqlalchemy.orm import Session

from app.db.models import Asset, Project
from app.services.storage_service import StorageService
from app.services.project_service import ProjectService


class IngestService:
    def __init__(self, storage_root: str):
        self.storage = StorageService(storage_root=storage_root)

    def create_project_with_upload(
        self,
        session: Session,
        name: str,
        filename: str,
        content_type: str | None,
        content: bytes,
        created_by_user_id: str | None = None,
    ) -> Project:
        extension = os.path.splitext(filename)[1].lower()
        source_type = "cbz" if extension == ".cbz" else "pdf"
        project = ProjectService.create(session, name=name, source_type=source_type, created_by_user_id=created_by_user_id)

        object_key = f"projects/{project.id}/source{extension}"
        storage_path = self.storage.put_bytes(
            object_key,
            content,
            content_type or "application/octet-stream",
        )

        asset = Asset(
            project_id=project.id,
            asset_type="source_file",
            storage_path=storage_path,
            mime_type=content_type or "application/octet-stream",
        )
        session.add(asset)
        session.flush()

        project.source_asset_id = asset.id
        session.commit()
        session.refresh(project)
        return project
