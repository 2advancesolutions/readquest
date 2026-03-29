"""Spelling Arena models — SpellingSession, SpellingAttempt, WordMastery"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class SpellingSession(Base):
    """One game round per session."""
    __tablename__ = "spelling_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    character_name: Mapped[str] = mapped_column(String(100))
    total_words: Mapped[int] = mapped_column(Integer, default=10)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)


class SpellingAttempt(Base):
    """One word attempt within a spelling session."""
    __tablename__ = "spelling_attempts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("spelling_sessions.id"))
    word: Mapped[str] = mapped_column(Text)
    game_mode: Mapped[str] = mapped_column(String(20))   # 'bee' | 'blanks' | 'scramble'
    student_answer: Mapped[str] = mapped_column(Text)
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    attempt_number: Mapped[int] = mapped_column(Integer, default=1)  # retry counter


class WordMastery(Base):
    """Per-student, per-word mastery tracking."""
    __tablename__ = "word_mastery"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    word: Mapped[str] = mapped_column(Text, index=True)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    mastered: Mapped[bool] = mapped_column(Boolean, default=False)   # True when correct_count >= 3
    last_practiced_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
