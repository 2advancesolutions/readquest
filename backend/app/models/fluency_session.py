"""Fluency Session models — stores text-based reading metrics only. No audio stored."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class FluencySession(Base):
    __tablename__ = "fluency_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    story_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("stories.id"))
    page_number: Mapped[int] = mapped_column(Integer)
    words_per_minute: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    accuracy_pct: Mapped[float] = mapped_column(Float, default=0.0)
    total_words: Mapped[int] = mapped_column(Integer, default=0)
    correct_words: Mapped[int] = mapped_column(Integer, default=0)
    # AI-generated encouraging feedback from fluency_agent
    feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class WordError(Base):
    """Per-word error within a fluency session. Derived from Web Speech API transcript diff."""
    __tablename__ = "word_errors"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("fluency_sessions.id"))
    word: Mapped[str] = mapped_column(Text)                       # The target word from the story
    spoken_word: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # What the child said (if any)
    error_type: Mapped[str] = mapped_column(String(20))           # 'mispronounced' | 'skipped' | 'repeated'
    word_index: Mapped[int] = mapped_column(Integer)              # Position in page text (for highlight sync)
