"""
Gamification Service — b3
XP rules engine, badge trigger system, streak tracking
"""
from datetime import datetime, date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.gamification import XPLedger, Badge, StudentBadge, Streak

XP_RULES = {
    "page_read": 5,
    "quiz_correct": 10,
    "quiz_attempt": 3,
    "book_complete": 50,
    "daily_login": 15,
    "streak_3": 25,
    "streak_7": 75,
    "streak_14": 150,
    "streak_30": 500,
}

BADGE_DEFINITIONS = [
    {"slug": "first_book",   "name": "First Book!",    "icon": "📖", "description": "Read your first book",        "criteria": {"books_completed": 1}},
    {"slug": "streak_3",     "name": "3-Day Streak",   "icon": "🔥", "description": "Read 3 days in a row",        "criteria": {"streak": 3}},
    {"slug": "streak_7",     "name": "7-Day Streak",   "icon": "🏆", "description": "Read 7 days in a row",        "criteria": {"streak": 7}},
    {"slug": "quiz_master",  "name": "Quiz Master",    "icon": "🧠", "description": "Get 5 quiz questions right",  "criteria": {"quiz_correct": 5}},
    {"slug": "speed_reader", "name": "Speed Reader",   "icon": "⚡", "description": "Read a book in under 10 min", "criteria": {"speed_book": True}},
    {"slug": "explorer",     "name": "Genre Explorer", "icon": "🗺️", "description": "Read 3 different themes",     "criteria": {"themes": 3}},
    {"slug": "bookworm",     "name": "Bookworm",       "icon": "🐛", "description": "Complete 5 books",           "criteria": {"books_completed": 5}},
    {"slug": "word_wizard",  "name": "Word Wizard",    "icon": "🔮", "description": "Reach level 3",              "criteria": {"level": 3}},
]


async def award_xp(db: AsyncSession, student_id: str, amount: int, reason: str) -> int:
    """Award XP to a student and check for badge triggers."""
    import uuid as _uuid_check
    try:
        _uuid_check.UUID(student_id)
    except (ValueError, AttributeError):
        return 0  # skip DB insert for non-UUID IDs like "guest"

    ledger_entry = XPLedger(student_id=student_id, amount=amount, reason=reason)
    db.add(ledger_entry)

    # Track streak
    await track_streak(db, student_id)

    await db.commit()
    await check_badges(db, student_id)
    return amount


async def track_streak(db: AsyncSession, student_id: str):
    """Add today to streak if not already present."""
    today = date.today()
    result = await db.execute(
        select(Streak).where(Streak.student_id == student_id, Streak.active_date == today)
    )
    if not result.scalar_one_or_none():
        db.add(Streak(student_id=student_id, active_date=today))


async def get_streak_length(db: AsyncSession, student_id: str) -> int:
    from datetime import timedelta
    from sqlalchemy import desc
    result = await db.execute(
        select(Streak.active_date).where(Streak.student_id == student_id).order_by(desc(Streak.active_date))
    )
    streak_dates = [r[0] for r in result.fetchall()]
    length = 0
    check = date.today()
    for d in streak_dates:
        if d == check:
            length += 1
            check -= timedelta(days=1)
        else:
            break
    return length


async def check_badges(db: AsyncSession, student_id: str):
    """Check if any new badges should be awarded."""
    # Get already earned badges
    earned_result = await db.execute(
        select(StudentBadge.badge_id).where(StudentBadge.student_id == student_id)
    )
    earned_badge_ids = {r[0] for r in earned_result.fetchall()}

    # Get total XP
    xp_result = await db.execute(
        select(func.sum(XPLedger.amount)).where(XPLedger.student_id == student_id)
    )
    total_xp = xp_result.scalar() or 0
    level = min(total_xp // 200 + 1, 5)

    # Get quiz correct count
    from app.models.quiz import QuizAttempt
    correct_result = await db.execute(
        select(func.count(QuizAttempt.id)).where(
            QuizAttempt.student_id == student_id, QuizAttempt.is_correct == True
        )
    )
    quiz_correct_count = correct_result.scalar() or 0

    # Get streak length
    streak = await get_streak_length(db, student_id)

    all_badges_result = await db.execute(select(Badge))
    all_badges = all_badges_result.scalars().all()

    for badge in all_badges:
        if badge.id in earned_badge_ids:
            continue
        criteria = badge.criteria or {}
        should_award = False

        if "streak" in criteria and streak >= criteria["streak"]:
            should_award = True
        if "level" in criteria and level >= criteria["level"]:
            should_award = True
        if "quiz_correct" in criteria and quiz_correct_count >= criteria["quiz_correct"]:
            should_award = True

        if should_award:
            db.add(StudentBadge(student_id=student_id, badge_id=badge.id))

    await db.commit()


async def seed_badges(db: AsyncSession):
    """Seed default badges if not present."""
    for b in BADGE_DEFINITIONS:
        result = await db.execute(select(Badge).where(Badge.slug == b["slug"]))
        if not result.scalar_one_or_none():
            db.add(Badge(**b))
    await db.commit()
