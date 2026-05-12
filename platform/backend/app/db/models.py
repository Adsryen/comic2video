import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    source_asset_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("assets.id"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(50), default="UPLOADED", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("projects.id"),
        nullable=True,
    )
    job_id: Mapped[str | None] = mapped_column(
        String(36),
        ForeignKey("jobs.id"),
        nullable=True,
    )
    asset_type: Mapped[str] = mapped_column(String(50), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(255), nullable=False)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )



class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    job_type: Mapped[str] = mapped_column(String(50), default="generate_video", nullable=False)
    mode: Mapped[str] = mapped_column(String(50), nullable=False)
    language: Mapped[str | None] = mapped_column(String(20), nullable=True)
    voice: Mapped[str | None] = mapped_column(String(100), nullable=True)
    subtitle_enabled: Mapped[str | None] = mapped_column(String(10), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="QUEUED", nullable=False)
    progress: Mapped[int] = mapped_column(default=0, nullable=False)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class JobStep(Base):
    __tablename__ = "job_steps"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    step_name: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False)
    input_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)



class Storyboard(Base):
    __tablename__ = "storyboards"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id"), nullable=False)
    job_id: Mapped[str] = mapped_column(String(36), ForeignKey("jobs.id"), nullable=False)
    version: Mapped[int] = mapped_column(default=1, nullable=False)
    content_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
