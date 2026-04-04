"""Story and StoryPage models"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, JSON, ForeignKey, Boolean
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
    # SEL fields
    is_sel_story: Mapped[bool] = mapped_column(Boolean, default=False)
    sel_tags: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # e.g. ['bullying', 'empathy']
    sel_reflections: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)  # AI reflections + Socratic hints
    # Story mode: 'free_play' (default) | 'quest' (structured progression)
    story_mode: Mapped[str] = mapped_column(String(20), default="free_play")
    # Art style used for image generation (cartoon, comic, watercolor, anime, realistic, fantasy)
    art_style: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="cartoon")
    # Community voting (public thumbs up/down)
    vote_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Public view counter
    view_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Public like counter (one like per session, no unlike)
    like_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Whether this story appears in the public book gallery
    is_public: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")


class StoryPage(Base):
    __tablename__ = "story_pages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    story_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("stories.id"))
    page_number: Mapped[int] = mapped_column(Integer)
    content: Mapped[str] = mapped_column(Text)
    media_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
