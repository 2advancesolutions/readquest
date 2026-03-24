"""Gamification models — XP, Badges, Streaks"""
import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, Date, Boolean, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class XPLedger(Base):
    __tablename__ = "xp_ledger"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"))
    amount: Mapped[int] = mapped_column(Integer)
    reason: Mapped[str] = mapped_column(String(100))
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug: Mapped[str] = mapped_column(String(50), unique=True)
    name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(10))
    description: Mapped[str] = mapped_column(Text)
    criteria: Mapped[dict] = mapped_column(JSON)


class StudentBadge(Base):
    __tablename__ = "student_badges"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"))
    badge_id: Mapped[str] = mapped_column(String, ForeignKey("badges.id"))
    earned_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Streak(Base):
    __tablename__ = "streaks"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"))
    active_date: Mapped[date] = mapped_column(Date)


class ReadingProgress(Base):
    __tablename__ = "reading_progress"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String, ForeignKey("students.id"))
    story_id: Mapped[str] = mapped_column(String, ForeignKey("stories.id"))
    pages_read: Mapped[int] = mapped_column(Integer, default=0)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
