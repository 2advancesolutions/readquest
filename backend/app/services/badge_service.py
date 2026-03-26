"""Badge awarding service — checks criteria and grants badges automatically."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.gamification import Badge, StudentBadge, Streak, XPLedger, ReadingProgress
import uuid


async def check_and_award_badges(db: AsyncSession, student_id: str) -> list[str]:
    """
    Evaluate all badge criteria for the student and award any newly-earned badges.
    Returns a list of newly awarded badge slugs.
    """
    # ── Gather student stats ──────────────────────────────────────────────────
    stories_read_q  = await db.execute(
        select(func.count()).where(ReadingProgress.student_id == student_id, ReadingProgress.completed == True)
    )
    stories_read = stories_read_q.scalar() or 0

    # Current streak (consecutive days including today)
    from datetime import date, timedelta
    from sqlalchemy import desc
    streak_q = await db.execute(
        select(Streak.active_date).where(Streak.student_id == student_id).order_by(desc(Streak.active_date))
    )
    streak_dates = [r[0] for r in streak_q.fetchall()]
    current_streak = 0
    check = date.today()
    for d in streak_dates:
        if d == check:
            current_streak += 1
            check -= timedelta(days=1)
        else:
            break

    # Total XP → level
    xp_q = await db.execute(select(func.sum(XPLedger.amount)).where(XPLedger.student_id == student_id))
    total_xp = xp_q.scalar() or 0
    level = min(max(total_xp // 200 + 1, 1), 5)

    stats = {
        "stories_read": stories_read,
        "streak_days": current_streak,
        "level": level,
    }

    # ── Load all badges and already-earned badge IDs ──────────────────────────
    all_badges_q = await db.execute(select(Badge))
    all_badges   = all_badges_q.scalars().all()
    earned_q     = await db.execute(
        select(StudentBadge.badge_id).where(StudentBadge.student_id == student_id)
    )
    already_earned = {r[0] for r in earned_q.fetchall()}

    newly_awarded: list[str] = []

    for badge in all_badges:
        if badge.id in already_earned:
            continue  # already have it

        criteria = badge.criteria or {}
        earned = False

        if "stories_read" in criteria and stories_read >= criteria["stories_read"]:
            earned = True
        if "streak_days" in criteria and current_streak >= criteria["streak_days"]:
            earned = True
        if "level" in criteria and level >= criteria["level"]:
            earned = True
        # quiz_correct and speed_minutes require richer data — skip for now

        if earned:
            db.add(StudentBadge(
                id=str(uuid.uuid4()),
                student_id=student_id,
                badge_id=badge.id,
            ))
            newly_awarded.append(badge.slug)

    if newly_awarded:
        await db.commit()

    return newly_awarded
