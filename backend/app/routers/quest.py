"""
Quest router — academic progression levels and unlock logic.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.quest import QuestLevel, QuestProgress

router = APIRouter()

# Default quest level seed data — seeded on first call to GET /levels
QUEST_LEVEL_SEEDS = [
    {"level_number": 1, "name": "Word Explorer",      "description": "Begin your reading adventure!", "required_stories": 1, "min_accuracy_pct": 60.0, "min_quiz_pct": 60.0, "min_assignment_score": 60.0, "xp_reward": 100, "badge_slug": "first_book"},
    {"level_number": 2, "name": "Story Seeker",       "description": "Dive deeper into stories!", "required_stories": 2, "min_accuracy_pct": 65.0, "min_quiz_pct": 65.0, "min_assignment_score": 65.0, "xp_reward": 150, "badge_slug": "bookworm"},
    {"level_number": 3, "name": "Reading Ranger",     "description": "You're becoming a real reader!", "required_stories": 2, "min_accuracy_pct": 70.0, "min_quiz_pct": 70.0, "min_assignment_score": 70.0, "xp_reward": 200, "badge_slug": "word_wizard"},
    {"level_number": 4, "name": "Page Turner",        "description": "Keep turning those pages!", "required_stories": 3, "min_accuracy_pct": 75.0, "min_quiz_pct": 72.0, "min_assignment_score": 72.0, "xp_reward": 250, "badge_slug": None},
    {"level_number": 5, "name": "Vocabulary Voyager", "description": "Master of words!", "required_stories": 3, "min_accuracy_pct": 78.0, "min_quiz_pct": 75.0, "min_assignment_score": 75.0, "xp_reward": 300, "badge_slug": "quiz_master"},
    {"level_number": 6, "name": "Story Champion",     "description": "Champion of reading!", "required_stories": 4, "min_accuracy_pct": 82.0, "min_quiz_pct": 78.0, "min_assignment_score": 78.0, "xp_reward": 400, "badge_slug": "streak_7"},
    {"level_number": 7, "name": "Reading Legend",     "description": "A true reading legend!", "required_stories": 4, "min_accuracy_pct": 85.0, "min_quiz_pct": 82.0, "min_assignment_score": 80.0, "xp_reward": 500, "badge_slug": "explorer"},
    {"level_number": 8, "name": "Grand Bookmaster",   "description": "You've mastered the art of reading!", "required_stories": 5, "min_accuracy_pct": 90.0, "min_quiz_pct": 85.0, "min_assignment_score": 85.0, "xp_reward": 750, "badge_slug": None},
]


async def _seed_levels_if_needed(db: AsyncSession):
    """Seed quest levels if not already present."""
    count_r = await db.execute(select(QuestLevel))
    existing = count_r.scalars().all()
    if len(existing) >= len(QUEST_LEVEL_SEEDS):
        return
    existing_nums = {ql.level_number for ql in existing}
    for seed in QUEST_LEVEL_SEEDS:
        if seed["level_number"] not in existing_nums:
            db.add(QuestLevel(**seed))
    await db.commit()


@router.get("/levels")
async def get_quest_levels(db: AsyncSession = Depends(get_session)):
    """Return all quest level definitions. Seeds on first call."""
    await _seed_levels_if_needed(db)
    result = await db.execute(select(QuestLevel).order_by(QuestLevel.level_number))
    levels = result.scalars().all()
    return [
        {
            "id": lv.id,
            "level_number": lv.level_number,
            "name": lv.name,
            "description": lv.description,
            "required_stories": lv.required_stories,
            "min_accuracy_pct": lv.min_accuracy_pct,
            "min_quiz_pct": lv.min_quiz_pct,
            "min_assignment_score": lv.min_assignment_score,
            "xp_reward": lv.xp_reward,
            "badge_slug": lv.badge_slug,
        }
        for lv in levels
    ]


@router.get("/progress/{student_id}")
async def get_quest_progress(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get or initialize a student's quest progress."""
    result = await db.execute(
        select(QuestProgress).where(QuestProgress.student_id == student_id)
    )
    progress = result.scalar_one_or_none()

    if not progress:
        # Initialize at level 1
        progress = QuestProgress(student_id=student_id, current_level=1)
        db.add(progress)
        await db.commit()
        await db.refresh(progress)

    # Fetch level definition for context
    level_r = await db.execute(
        select(QuestLevel).where(QuestLevel.level_number == progress.current_level)
    )
    level = level_r.scalar_one_or_none()

    return {
        "student_id": student_id,
        "current_level": progress.current_level,
        "level_name": level.name if level else f"Level {progress.current_level}",
        "stories_completed": progress.stories_completed,
        "stories_required": level.required_stories if level else 1,
        "avg_accuracy": progress.avg_accuracy,
        "min_accuracy_required": level.min_accuracy_pct if level else 60.0,
        "avg_quiz_score": progress.avg_quiz_score,
        "min_quiz_required": level.min_quiz_pct if level else 60.0,
        "avg_assignment_score": progress.avg_assignment_score,
        "min_assignment_required": level.min_assignment_score if level else 60.0,
        "unlocked_at": str(progress.unlocked_at),
    }


@router.post("/check-unlock/{student_id}")
async def check_level_unlock(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """
    Check if a student has met all requirements to advance to the next quest level.
    Called after story completion. If conditions met, advances and awards XP + badge.
    """
    from app.services.gamification_service import award_xp
    from app.services.badge_service import check_and_award_badges

    progress_r = await db.execute(
        select(QuestProgress).where(QuestProgress.student_id == student_id)
    )
    progress = progress_r.scalar_one_or_none()
    if not progress:
        return {"unlocked": False, "reason": "No quest progress found"}

    level_r = await db.execute(
        select(QuestLevel).where(QuestLevel.level_number == progress.current_level)
    )
    level = level_r.scalar_one_or_none()
    if not level:
        return {"unlocked": False, "reason": "Level definition not found"}

    # Check all unlock conditions
    conditions = {
        "stories": progress.stories_completed >= level.required_stories,
        "accuracy": progress.avg_accuracy >= level.min_accuracy_pct,
        "quiz": progress.avg_quiz_score >= level.min_quiz_pct,
        "assignment": progress.avg_assignment_score >= level.min_assignment_score,
    }
    all_met = all(conditions.values())

    if not all_met:
        return {
            "unlocked": False,
            "conditions": conditions,
            "current_level": progress.current_level,
        }

    # Advance to next level
    next_level = progress.current_level + 1
    progress.current_level = next_level
    progress.stories_completed = 0
    progress.avg_accuracy = 0.0
    progress.avg_quiz_score = 0.0
    progress.avg_assignment_score = 0.0
    progress.unlocked_at = datetime.utcnow()
    await db.commit()

    # Award XP
    await award_xp(db, student_id, level.xp_reward, f"quest_level_{progress.current_level - 1}_complete")

    # Award badge if configured for this level
    if level.badge_slug:
        try:
            await check_and_award_badges(db, student_id)
        except Exception as e:
            print(f"[QuestRouter] Badge award failed (non-fatal): {e}")

    return {
        "unlocked": True,
        "new_level": next_level,
        "xp_awarded": level.xp_reward,
        "badge_slug": level.badge_slug,
        "conditions": conditions,
    }


@router.post("/progress/{student_id}/update")
async def update_quest_progress(
    student_id: str,
    story_accuracy: float = 0.0,
    quiz_score: float = 0.0,
    assignment_score: float = 0.0,
    db: AsyncSession = Depends(get_session),
):
    """
    Update a student's rolling averages after completing a quest story.
    Uses exponential moving average (alpha=0.3) to weight recent performance.
    """
    progress_r = await db.execute(
        select(QuestProgress).where(QuestProgress.student_id == student_id)
    )
    progress = progress_r.scalar_one_or_none()
    if not progress:
        progress = QuestProgress(student_id=student_id, current_level=1)
        db.add(progress)

    alpha = 0.3  # Weight for new reading vs history
    if progress.stories_completed == 0:
        progress.avg_accuracy = story_accuracy
        progress.avg_quiz_score = quiz_score
        progress.avg_assignment_score = assignment_score
    else:
        progress.avg_accuracy = alpha * story_accuracy + (1 - alpha) * progress.avg_accuracy
        progress.avg_quiz_score = alpha * quiz_score + (1 - alpha) * progress.avg_quiz_score
        progress.avg_assignment_score = alpha * assignment_score + (1 - alpha) * progress.avg_assignment_score

    progress.stories_completed += 1
    await db.commit()

    return {
        "stories_completed": progress.stories_completed,
        "avg_accuracy": round(progress.avg_accuracy, 1),
        "avg_quiz_score": round(progress.avg_quiz_score, 1),
        "avg_assignment_score": round(progress.avg_assignment_score, 1),
    }
