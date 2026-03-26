"""Rewards router — XP, badges, streaks, leaderboard"""
from fastapi import APIRouter, Depends, Header
from pydantic import BaseModel
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
    from app.models.gamification import ReadingProgress

    # ── Total XP & level ───────────────────────────────────────────────────
    total_result = await db.execute(select(func.sum(XPLedger.amount)).where(XPLedger.student_id == x_student_id))
    total_xp = total_result.scalar() or 0
    level, level_name, xp_to_next, pct = compute_level(total_xp)

    # ── Current streak ─────────────────────────────────────────────────────
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

    # ── XP history — last 7 days ───────────────────────────────────────────
    xp_history = []
    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i)
        result = await db.execute(
            select(func.sum(XPLedger.amount)).where(
                XPLedger.student_id == x_student_id,
                func.date(XPLedger.earned_at) == day,
            )
        )
        xp_history.append({"date": day.strftime("%a"), "amount": result.scalar() or 0})

    # ── Weekly activity — did the student read on each of the last 7 days? ─
    weekly_activity = []
    for i in range(6, -1, -1):
        day = date.today() - timedelta(days=i)
        read_result = await db.execute(
            select(func.count()).where(
                Streak.student_id == x_student_id,
                Streak.active_date == day,
            )
        )
        weekly_activity.append({"date": day.strftime("%a"), "active": (read_result.scalar() or 0) > 0})

    # ── Badges ─────────────────────────────────────────────────────────────
    all_badges = (await db.execute(select(Badge))).scalars().all()
    earned_ids = set(
        r[0] for r in (await db.execute(
            select(StudentBadge.badge_id).where(StudentBadge.student_id == x_student_id)
        )).fetchall()
    )
    badges = [
        {"id": b.id, "slug": b.slug, "name": b.name, "icon": b.icon,
         "description": b.description, "earned": b.id in earned_ids}
        for b in all_badges
    ]

    # ── Stories read count ─────────────────────────────────────────────────
    stories_result = await db.execute(
        select(func.count()).where(
            ReadingProgress.student_id == x_student_id,
            ReadingProgress.completed == True,
        )
    )
    stories_read = stories_result.scalar() or 0

    return {
        "total_xp": total_xp,
        "level": level,
        "level_name": level_name,
        "xp_to_next_level": xp_to_next,
        "xp_progress_pct": round(pct, 1),
        "current_streak": current_streak,
        "xp_history": xp_history,
        "weekly_activity": weekly_activity,
        "badges": badges,
        "stories_read": stories_read,
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



@router.post("/record-activity")
async def record_activity(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """
    Record that the student read today — updates streak and weekly activity.
    Call this whenever a page is completed or a story is finished.
    """
    from app.models.gamification import ReadingProgress
    today = date.today()

    # Only insert one streak row per day per student
    existing = await db.execute(
        select(Streak).where(
            Streak.student_id == x_student_id,
            Streak.active_date == today,
        )
    )
    if not existing.scalar_one_or_none():
        db.add(Streak(student_id=x_student_id, active_date=today))
        await db.commit()

    return {"recorded": True, "date": str(today)}


@router.post("/complete-story")
async def complete_story(
    story_id: str,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Mark a story as completed and record reading progress."""
    from app.models.gamification import ReadingProgress
    from datetime import datetime

    existing = await db.execute(
        select(ReadingProgress).where(
            ReadingProgress.student_id == x_student_id,
            ReadingProgress.story_id == story_id,
        )
    )
    prog = existing.scalar_one_or_none()
    if prog:
        prog.completed = True
        prog.completed_at = datetime.utcnow()
    else:
        db.add(ReadingProgress(
            student_id=x_student_id,
            story_id=story_id,
            completed=True,
            completed_at=datetime.utcnow(),
        ))
    await db.commit()

    # ── Auto-award any newly unlocked badges ───────────────────────────────
    try:
        from app.services.badge_service import check_and_award_badges
        newly_earned = await check_and_award_badges(db, x_student_id)
    except Exception:
        newly_earned = []

    return {"completed": True, "badges_earned": newly_earned}


class AwardXPRequest(BaseModel):
    amount: int
    reason: str
    idempotency_key: str   # e.g. story_id — prevents double-awarding


class SyncXPRequest(BaseModel):
    entries: list[dict]    # list of {story_id, total_xp, reason}


@router.post("/award-xp")
async def award_xp_direct(
    body: AwardXPRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Award XP to the correct student with idempotency — safe to call multiple times."""
    from app.services.gamification_service import award_xp as _award_xp
    # Check if we already awarded XP for this idempotency key
    existing = await db.execute(
        select(XPLedger).where(
            XPLedger.student_id == x_student_id,
            XPLedger.reason == body.idempotency_key,
        )
    )
    if existing.scalar_one_or_none():
        total = (await db.execute(
            select(func.sum(XPLedger.amount)).where(XPLedger.student_id == x_student_id)
        )).scalar() or 0
        return {"awarded": False, "already_awarded": True, "total_xp": int(total)}

    total_xp = await _award_xp(db, x_student_id, body.amount, body.idempotency_key)

    # Auto-check badges after new XP
    try:
        from app.services.badge_service import check_and_award_badges
        newly_earned = await check_and_award_badges(db, x_student_id)
    except Exception:
        newly_earned = []

    return {"awarded": True, "amount": body.amount, "total_xp": total_xp, "badges_earned": newly_earned}


@router.post("/sync-xp")
async def sync_xp(
    body: SyncXPRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Backfill XP from a list of reading log entries — idempotent, safe to call on page load."""
    from app.services.gamification_service import award_xp as _award_xp
    awarded_count = 0
    for entry in body.entries:
        story_id = entry.get("story_id", "")
        xp = int(entry.get("total_xp", 0))
        reason = f"reading_log_{story_id}"
        if xp <= 0:
            continue
        existing = await db.execute(
            select(XPLedger).where(
                XPLedger.student_id == x_student_id,
                XPLedger.reason == reason,
            )
        )
        if existing.scalar_one_or_none():
            continue
        await _award_xp(db, x_student_id, xp, reason)
        awarded_count += 1

    total = (await db.execute(
        select(func.sum(XPLedger.amount)).where(XPLedger.student_id == x_student_id)
    )).scalar() or 0
    return {"synced": awarded_count, "total_xp": int(total)}


@router.get("/leaderboard")
async def get_leaderboard(
    x_student_id: str = Header(None),
    db: AsyncSession = Depends(get_session)
):
    parent_id = None
    if x_student_id:
        # Check if x_student_id is a student — if so, find their parent
        student_res = await db.execute(select(Student.parent_id).where(Student.id == x_student_id))
        pid = student_res.scalar_one_or_none()
        if pid:
            parent_id = pid
        else:
            # x_student_id might actually be the parent's UUID (auth user id)
            parent_id = x_student_id

    query = (
        select(Student.id, Student.name, func.coalesce(func.sum(XPLedger.amount), 0).label("total_xp"))
        .outerjoin(XPLedger, XPLedger.student_id == Student.id)
        .group_by(Student.id, Student.name)
        .order_by(desc("total_xp"))
    )

    if parent_id:
        query = query.where(Student.parent_id == parent_id)
    else:
        query = query.limit(25)

    result = await db.execute(query)
    rows = result.fetchall()

    leaderboard = []
    for rank, (student_id, name, total_xp) in enumerate(rows, start=1):
        level, level_name, _, _ = compute_level(total_xp)
        leaderboard.append({
            "student_id": student_id,
            "name": name,
            "total_xp": int(total_xp),
            "level": level,
            "level_name": level_name,
            "rank": rank,
        })
    return leaderboard
