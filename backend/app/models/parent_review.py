"""Parent Review model — star grades and comments on child performance."""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ParentReview(Base):
    __tablename__ = "parent_reviews"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    # Supabase auth.users UUID — no FK, managed by Supabase auth
    parent_id: Mapped[str] = mapped_column(UUID(as_uuid=False))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    # A review can target an assignment OR a fluency session (or both, or neither for general notes)
    assignment_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("assignments.id"), nullable=True)
    fluency_session_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("fluency_sessions.id"), nullable=True)
    # 1-5 stars
    star_grade: Mapped[int] = mapped_column(Integer)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
