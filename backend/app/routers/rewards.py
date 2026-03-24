"""Rewards router — XP, badges, streaks, leaderboard"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from datetime import date, timedelta
from typing import Tuple
from app.database import get_session
from app.models.gamification import XPLedger, Badge, StudentBadge, Streak
from app.models.student import Student

router = APIRouter()

XP_PER_LEVEL = 200
LEVEL_NAMES = {1: "Bookworm 🐛", 2: "Story Explorer 🗺️", 3: "Word Wizard 🔮", 4: "Reading Champion 🏆", 5: "Legend 🌟"}


def compute_level(total_xp: int) -> Tuple[int, str, int, float]:
    level = min(max(total_xp // XP_PER_LEVEL + 1, 1), 5)
    xp_in_level = total_xp % XP_PER_LEVEL
    xp_to_next = XP_PER_LEVEL - xp_in_level
    pct = (xp_in_level / XP_PER_LEVEL) * 100
    return level, LEVEL_NAMES.get(level, "Legend 🌟"), xp_to_next, pct


@router.get("/xp")
async def get_xp(x_student_id: str = Header(...), db: AsyncSession = Depends(get_session)):
    total_result = await db.execute(select(func.sum(XPLedger.amount)).where(XPLedger.student_id == x_student_id))
    total_xp = total_result.scalar() or 0
    level, level_name, xp_to_next, pct = compute_level(total_xp)

    # Current streak
    streak_result = await db.execute(
        select(Streak.active_date).where(Streak.student_id == x_student_id).order_by(desc(Streak.active_date))
    )
    streak_dates = [r[0] for r in streak_result.fetchall()]
    current_streak = 0
    check_date = date.today()
    for d in streak_dates:
        if d == check_date:
            current_streak += 1
            check_date -= timedelta(days=1)
        else:
            break

    return {
        "total_xp": total_xp,
        "level": level,
        "level_name": level_name,
        "xp_to_next_level": xp_to_next,
        "xp_progress_pct": round(pct, 1),
        "current_streak": current_streak,
    }


@router.get("/xp/history")
async def get_xp_history(x_student_id: str = Header(...), db: AsyncSession = Depends(get_session)):
    # Last 7 days
    days = []
    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i)
        result = await db.execute(
            select(func.sum(XPLedger.amount)).where(
                XPLedger.student_id == x_student_id,
                func.date(XPLedger.earned_at) == day,
            )
        )
        days.append({"date": day.strftime("%a"), "amount": result.scalar() or 0})
    return days


@router.get("/badges")
async def get_badges(x_student_id: str = Header(...), db: AsyncSession = Depends(get_session)):
    all_badges = (await db.execute(select(Badge))).scalars().all()
    earned_ids = set(
        r[0] for r in (await db.execute(
            select(StudentBadge.badge_id).where(StudentBadge.student_id == x_student_id)
        )).fetchall()
    )
    return [
        {"id": b.id, "slug": b.slug, "name": b.name, "icon": b.icon, "description": b.description, "earned": b.id in earned_ids}
        for b in all_badges
    ]


@router.get("/streaks")
async def get_streaks(x_student_id: str = Header(...), db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(Streak.active_date).where(Streak.student_id == x_student_id).order_by(desc(Streak.active_date))
    )
    dates = [str(r[0]) for r in result.fetchall()]
    return {"active_dates": dates}


@router.get("/leaderboard")
async def get_leaderboard(db: AsyncSession = Depends(get_session)):
    result = await db.execute(
        select(XPLedger.student_id, func.sum(XPLedger.amount).label("total_xp"))
        .group_by(XPLedger.student_id)
        .order_by(desc("total_xp"))
        .limit(10)
    )
    rows = result.fetchall()
    leaderboard = []
    for rank, (student_id, total_xp) in enumerate(rows, start=1):
        student_res = await db.execute(select(Student).where(Student.id == student_id))
        student = student_res.scalar_one_or_none()
        if student:
            level, level_name, _, _ = compute_level(total_xp)
            leaderboard.append({
                "student_id": student_id,
                "name": student.name,
                "total_xp": total_xp,
                "level": level,
                "level_name": level_name,
                "rank": rank,
            })
    return leaderboard
