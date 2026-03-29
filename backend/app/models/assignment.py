"""Assignment models — AI-generated and parent-created learning tasks."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Float, Text, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    title: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text)
    # 'vocabulary' | 'fluency' | 'comprehension' | 'mixed'
    assignment_type: Mapped[str] = mapped_column(String(30), default="mixed")
    # JSON array of tasks: [{type, prompt, options?, correct_answer?}]
    content: Mapped[dict] = mapped_column(JSON, default=list)
    # 'ai_generated' | 'parent_created'
    source: Mapped[str] = mapped_column(String(20), default="ai_generated")
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1)
    # 'pending' | 'in_progress' | 'completed' | 'reviewed'
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    # Source story/session for context (used by AI to generate relevant tasks)
    source_story_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("stories.id"), nullable=True)
    source_session_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("fluency_sessions.id"), nullable=True)


class AssignmentResult(Base):
    __tablename__ = "assignment_results"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    assignment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("assignments.id"))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    # JSON object of student answers keyed by task index
    answers: Mapped[dict] = mapped_column(JSON, default=dict)
    score_pct: Mapped[float] = mapped_column(Float, default=0.0)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
