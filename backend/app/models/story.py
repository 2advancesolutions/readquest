"""Story and StoryPage models"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Story(Base):
    __tablename__ = "stories"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    title: Mapped[str] = mapped_column(Text)  # no length limit — AI titles vary
    grade_level: Mapped[int] = mapped_column(Integer)
    theme: Mapped[str] = mapped_column(Text)  # freeform scene descriptions can be long
    cover_media_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StoryPage(Base):
    __tablename__ = "story_pages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    story_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("stories.id"))
    page_number: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    media_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
