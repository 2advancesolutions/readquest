"""Reading Exam Center models — ReadingExam, ReadingExamQuestion, ReadingExamAttempt"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, Boolean, Text, DateTime, Float, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class ReadingExam(Base):
    """One generated exam for a student at a specific grade + section."""
    __tablename__ = "reading_exams"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    grade_level: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(50))   # 'phonics'|'vocabulary'|'comprehension'|'grammar'|'mixed'|'practice'
    is_practice: Mapped[bool] = mapped_column(Boolean, default=False)   # 15Q / 10min warmup
    total_questions: Mapped[int] = mapped_column(Integer, default=30)
    time_limit_sec: Mapped[int] = mapped_column(Integer, default=1800)  # 30 min; practice = 600
    exam_difficulty: Mapped[str] = mapped_column(String(20), default="medium")  # 'easy'|'medium'|'hard'
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ReadingExamQuestion(Base):
    """One question within a ReadingExam."""
    __tablename__ = "reading_exam_questions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("reading_exams.id"))
    question_number: Mapped[int] = mapped_column(Integer)
    strand: Mapped[str] = mapped_column(String(50))
    question_type: Mapped[str] = mapped_column(String(20))   # 'single' | 'multi'
    passage: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    question_text: Mapped[str] = mapped_column(Text)
    choices: Mapped[list] = mapped_column(JSON)
    correct_answers: Mapped[list] = mapped_column(JSON)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), default="medium")


class ReadingExamAttempt(Base):
    """One student's completed attempt at a ReadingExam."""
    __tablename__ = "reading_exam_attempts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    exam_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("reading_exams.id"))
    student_id: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("students.id"), nullable=True)
    grade_level: Mapped[int] = mapped_column(Integer)
    section: Mapped[str] = mapped_column(String(50))
    is_practice: Mapped[bool] = mapped_column(Boolean, default=False)
    exam_number: Mapped[int] = mapped_column(Integer, default=0)   # sequential attempt # at this grade (1–10)
    retake_number: Mapped[int] = mapped_column(Integer, default=0)  # 0=first try, 1=retake1, 2=retake2
    answers: Mapped[dict] = mapped_column(JSON)
    correct_count: Mapped[int] = mapped_column(Integer, default=0)
    total_questions: Mapped[int] = mapped_column(Integer, default=30)
    score_pct: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    time_taken_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    reset_triggered: Mapped[bool] = mapped_column(Boolean, default=False)  # True if this attempt caused a reset
