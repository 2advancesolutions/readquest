"""SQLAlchemy model for per-student game progress."""
from sqlalchemy import Column, String, Integer, DateTime, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid


class GameProgress(Base):
    __tablename__ = "game_progress"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id  = Column(String, nullable=False, index=True)
    game_id     = Column(String, nullable=False)
    grade_level = Column(Integer, nullable=False, default=1)
    level       = Column(Integer, nullable=False, default=1)
    stars       = Column(Integer, nullable=False, default=0)
    updated_at  = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("student_id", "game_id", "grade_level", name="uq_game_progress"),
    )
