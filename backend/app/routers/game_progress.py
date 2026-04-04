"""Game Progress router — save & load per-student game levels."""
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from app.database import get_session
from app.models.game_progress import GameProgress
from datetime import datetime
import uuid

router = APIRouter(prefix="/game-progress", tags=["game-progress"])


class GameProgressIn(BaseModel):
    game_id: str
    grade_level: int = 1
    level: int = 1
    stars: int = 0


class GameProgressOut(BaseModel):
    game_id: str
    grade_level: int
    level: int
    stars: int
    updated_at: Optional[datetime] = None


@router.post("", response_model=GameProgressOut)
async def upsert_game_progress(
    body: GameProgressIn,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Save (or update) a student's level and stars for a specific game + grade."""
    q = await db.execute(
        select(GameProgress).where(
            GameProgress.student_id == x_student_id,
            GameProgress.game_id == body.game_id,
            GameProgress.grade_level == body.grade_level,
        )
    )
    row = q.scalar_one_or_none()
    if row is None:
        row = GameProgress(
            id=uuid.uuid4(),
            student_id=x_student_id,
            game_id=body.game_id,
            grade_level=body.grade_level,
            level=body.level,
            stars=body.stars,
        )
        db.add(row)
    else:
        # Only update if the new level is higher (never regress)
        if body.level > row.level:
            row.level = body.level
        if body.stars > row.stars:
            row.stars = body.stars
        row.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(row)
    return GameProgressOut(
        game_id=row.game_id,
        grade_level=row.grade_level,
        level=row.level,
        stars=row.stars,
        updated_at=row.updated_at,
    )


@router.get("", response_model=List[GameProgressOut])
async def get_game_progress(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Get all game progress records for the current student."""
    q = await db.execute(
        select(GameProgress).where(GameProgress.student_id == x_student_id)
    )
    rows = q.scalars().all()
    return [
        GameProgressOut(
            game_id=r.game_id,
            grade_level=r.grade_level,
            level=r.level,
            stars=r.stars,
            updated_at=r.updated_at,
        )
        for r in rows
    ]
