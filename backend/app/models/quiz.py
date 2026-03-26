"""Quiz model"""
import uuid
from typing import Optional
from sqlalchemy import String, Text, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    story_page_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("story_pages.id"))
    question: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSON)
    correct_answer: Mapped[str] = mapped_column(String(200))
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"))
    question_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("quiz_questions.id"))
    answer: Mapped[str] = mapped_column(String(200))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
