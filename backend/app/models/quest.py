"""Quest models — structured academic progression levels."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class QuestLevel(Base):
    """Reference table — seeded on startup. Defines the requirements for each level."""
    __tablename__ = "quest_levels"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    level_number: Mapped[int] = mapped_column(Integer, unique=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    required_stories: Mapped[int] = mapped_column(Integer, default=1)
    min_accuracy_pct: Mapped[float] = mapped_column(Float, default=60.0)   # reading accuracy threshold
    min_quiz_pct: Mapped[float] = mapped_column(Float, default=60.0)        # quiz score threshold
    min_assignment_score: Mapped[float] = mapped_column(Float, default=60.0)  # assignment completion threshold
    badge_slug: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    xp_reward: Mapped[int] = mapped_column(Integer, default=100)


class QuestProgress(Base):
    """Per-student quest progress — one row per student, updated as they advance."""
    __tablename__ = "quest_progress"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"), unique=True)
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    stories_completed: Mapped[int] = mapped_column(Integer, default=0)  # within current level
    avg_accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    avg_quiz_score: Mapped[float] = mapped_column(Float, default=0.0)
    avg_assignment_score: Mapped[float] = mapped_column(Float, default=0.0)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
