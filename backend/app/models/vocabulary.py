"""Vocabulary Bank model — stores Tier 2 academic words extracted from stories."""
import uuid
from typing import Optional
from sqlalchemy import String, Integer, Text, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class VocabularyWord(Base):
    __tablename__ = "vocabulary_bank"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    word: Mapped[str] = mapped_column(Text, index=True)
    definition: Mapped[str] = mapped_column(Text)           # Kid-friendly definition
    example_sentence: Mapped[str] = mapped_column(Text)     # Example sentence using the word
    pronunciation_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # TTS URL
    grade_level: Mapped[int] = mapped_column(Integer)
    # Optional FK to the source story (can be NULL for manually added words)
    story_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("stories.id"), nullable=True)
    # Per-student ownership — if NULL, it's a shared catalog word
    student_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"), nullable=True)
    # Whether the student has saved this to their personal word bank
    is_saved: Mapped[bool] = mapped_column(Boolean, default=False)
