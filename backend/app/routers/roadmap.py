"""
Roadmap router — GET /api/roadmap
Returns a unified learning-progress snapshot for the Dashboard Learning Roadmap.
Aggregates: reading logs, spelling sessions, exam attempts, game progress.
"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_session
from app.models.game_progress import GameProgress

router = APIRouter(prefix="/roadmap", tags=["roadmap"])

# ── Pydantic output models ────────────────────────────────────────────────────

class CategoryProgress(BaseModel):
    pct: int
    label: str
    detail: str = ""


class GameItem(BaseModel):
    id: str
    title: str
    emoji: str
    level: int
    max_level: int = 100
    pct: int
    stars: int = 0


class GamesProgress(BaseModel):
    overall_pct: int
    breakdown: List[GameItem]


class SmartSuggestion(BaseModel):
    area: str
    emoji: str
    pct: int
    message: str
    action_url: str


class RoadmapOut(BaseModel):
    reading: CategoryProgress
    quizzes: CategoryProgress
    comprehension: CategoryProgress
    spelling: CategoryProgress
    exams: CategoryProgress
    games: GamesProgress
    smart_suggestion: SmartSuggestion


# ── Game metadata (mirrors GamesArcade.tsx) ────────────────────────────────────
GAME_META = [
    {"id": "rhyme",    "title": "Rhyme Time",        "emoji": "🎵", "action_url": "/games/rhyme"},
    {"id": "sentence", "title": "Sentence Builder",  "emoji": "🏗️", "action_url": "/games/sentence"},
    {"id": "phonics",  "title": "Phonics Power",     "emoji": "🔊", "action_url": "/games/phonics"},
    {"id": "vocab",    "title": "Vocabulary Vault",  "emoji": "🔐", "action_url": "/games/vocab"},
    {"id": "synonym",  "title": "Synonym Showdown",  "emoji": "⚔️", "action_url": "/games/synonym"},
    {"id": "grammar",  "title": "Grammar Galaxy",    "emoji": "🪐", "action_url": "/games/grammar"},
    {"id": "speed",    "title": "Speed Reader",      "emoji": "⚡", "action_url": "/games/speed"},
    {"id": "context",  "title": "Context Clues",     "emoji": "🔍", "action_url": "/games/context"},
]

# Suggestion templates per category
SUGGESTION_TEMPLATES = {
    "reading":       ("📖", "reading practice", "/generate"),
    "quizzes":       ("📝", "quiz sessions", "/shelf"),
    "comprehension": ("🧠", "comprehension exercises", "/shelf"),
    "spelling":      ("✏️", "spelling", "/spelling"),
    "exams":         ("🎓", "exam practice", "/exams"),
}

GAME_ACTION_MAP = {g["id"]: g["action_url"] for g in GAME_META}


@router.get("", response_model=RoadmapOut)
async def get_roadmap(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Aggregate all learning progress and return the roadmap data."""
    from app.models.spelling import SpellingSession, SpellingAttempt, WordMastery

    # ── 1. Reading logs (from Supabase directly via SQLAlchemy) ──────────────
    # We use raw SQL for the reading_logs table (it lives in Supabase public schema)
    from sqlalchemy import text

    reading_pct = 0
    quiz_pct = 0
    comp_pct = 0
    reading_detail = "No readings yet"
    quiz_detail = "No quizzes yet"
    comp_detail = "No data yet"

    try:
        logs_q = await db.execute(
            text("""
                SELECT
                  AVG(reading_accuracy)   AS avg_reading,
                  AVG(CASE WHEN quiz_total > 0 THEN (quiz_score::float / quiz_total) * 100 ELSE NULL END) AS avg_quiz,
                  AVG(comprehension_score) AS avg_comp,
                  COUNT(*)                AS total
                FROM reading_logs
                WHERE student_id = :sid
            """),
            {"sid": x_student_id},
        )
        row = logs_q.fetchone()
        if row and row.total and row.total > 0:
            reading_pct = int(row.avg_reading or 0)
            quiz_pct    = int(row.avg_quiz    or 0)
            comp_pct    = int(row.avg_comp    or 0)
            n = row.total
            reading_detail = f"Avg across {n} reading{'s' if n != 1 else ''}"
            quiz_detail    = f"Avg across {n} quiz{'zes' if n != 1 else ''}"
            comp_detail    = f"Avg across {n} reading{'s' if n != 1 else ''}"
    except Exception:
        pass  # table may not exist yet in local dev

    # ── 2. Spelling accuracy ──────────────────────────────────────────────────
    spell_pct = 0
    spell_detail = "No spelling sessions yet"
    try:
        session_ids_q = await db.execute(
            select(SpellingSession.id).where(SpellingSession.student_id == x_student_id)
        )
        session_ids = [r.id for r in session_ids_q]
        if session_ids:
            total_q = await db.execute(
                select(func.count()).where(SpellingAttempt.session_id.in_(session_ids))
            )
            correct_q = await db.execute(
                select(func.count()).where(
                    SpellingAttempt.session_id.in_(session_ids),
                    SpellingAttempt.is_correct == True,
                )
            )
            total_a   = total_q.scalar_one() or 0
            correct_a = correct_q.scalar_one() or 0
            if total_a > 0:
                spell_pct = int(round(correct_a / total_a * 100))
                spell_detail = f"{correct_a}/{total_a} correct"
    except Exception:
        pass

    # ── 3. Exam pass rate ─────────────────────────────────────────────────────
    exam_pct = 0
    exam_detail = "No exams yet"
    try:
        exam_q = await db.execute(
            text("""
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN passed THEN 1 ELSE 0 END) as passed
                FROM reading_exam_attempts
                WHERE student_id = :sid AND is_practice = false
            """),
            {"sid": x_student_id},
        )
        er = exam_q.fetchone()
        if er and er.total and int(er.total) > 0:
            exam_pct = int(round((int(er.passed or 0) / int(er.total)) * 100))
            exam_detail = f"{er.passed or 0}/{er.total} passed"
    except Exception:
        pass

    # ── 4. Game progress ──────────────────────────────────────────────────────
    gp_q = await db.execute(
        select(GameProgress).where(GameProgress.student_id == x_student_id)
    )
    gp_rows = {(r.game_id, r.grade_level): r for r in gp_q.scalars().all()}

    # Use the highest grade_level record for each game (latest progress)
    best_level: dict[str, int] = {}
    best_stars: dict[str, int] = {}
    for (game_id, _grade), row in gp_rows.items():
        if row.level > best_level.get(game_id, 0):
            best_level[game_id] = row.level
            best_stars[game_id] = row.stars

    game_items: List[GameItem] = []
    for meta in GAME_META:
        lvl = best_level.get(meta["id"], 1)
        stars = best_stars.get(meta["id"], 0)
        pct = min(int((lvl - 1)), 100)  # level 1 = 0%, level 101 = 100%
        game_items.append(GameItem(
            id=meta["id"],
            title=meta["title"],
            emoji=meta["emoji"],
            level=lvl,
            max_level=100,
            pct=pct,
            stars=stars,
        ))

    games_overall = int(sum(g.pct for g in game_items) / max(len(game_items), 1))
    games_progress = GamesProgress(overall_pct=games_overall, breakdown=game_items)

    # ── 5. Smart suggestion — lowest score wins ───────────────────────────────
    candidates = [
        ("reading",       reading_pct, "📖", "Reading Practice",    "/generate"),
        ("quizzes",       quiz_pct,    "📝", "Quiz Sessions",       "/library"),
        ("comprehension", comp_pct,    "🧠", "Comprehension",       "/library"),
        ("spelling",      spell_pct,   "✏️", "Spelling Arena",      "/spelling"),
        ("exams",         exam_pct,    "🎓", "Exam Center",         "/exams"),
    ]
    # Add lowest game to the mix
    if game_items:
        lowest_game = min(game_items, key=lambda g: g.pct)
        candidates.append(
            (f"game_{lowest_game.id}", lowest_game.pct, lowest_game.emoji,
             lowest_game.title, GAME_ACTION_MAP.get(lowest_game.id, "/games"))
        )

    # Pick lowest percentage (skip zeros of uncompleted categories last)
    # First try categories with any activity (pct > 0), then fall back to 0s
    active = [(k, p, em, label, url) for k, p, em, label, url in candidates if p > 0]
    pool = active if active else candidates
    worst = min(pool, key=lambda x: x[1])
    _, worst_pct, worst_emoji, worst_label, worst_url = worst

    if worst_pct >= 80:
        message = f"🌟 Amazing work! You're crushing it at {worst_label}. Keep it up!"
    elif worst_pct >= 60:
        message = f"Great reading! Let's practice more on: {worst_label}."
    else:
        message = f"Let's level up your {worst_label} skills — you've got this! 💪"

    suggestion = SmartSuggestion(
        area=worst_label,
        emoji=worst_emoji,
        pct=worst_pct,
        message=message,
        action_url=worst_url,
    )

    # ── Build response ────────────────────────────────────────────────────────
    return RoadmapOut(
        reading=CategoryProgress(pct=reading_pct, label="Reading / Pronunciation", detail=reading_detail),
        quizzes=CategoryProgress(pct=quiz_pct,    label="Quizzes",                detail=quiz_detail),
        comprehension=CategoryProgress(pct=comp_pct, label="Comprehension",       detail=comp_detail),
        spelling=CategoryProgress(pct=spell_pct,  label="Spelling Arena",         detail=spell_detail),
        exams=CategoryProgress(pct=exam_pct,      label="Exam Center",            detail=exam_detail),
        games=games_progress,
        smart_suggestion=suggestion,
    )
