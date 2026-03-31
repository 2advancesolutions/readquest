"""Spelling Arena API router."""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, List
from app.database import get_session
from app.models.spelling import SpellingSession, SpellingAttempt, WordMastery
from app.models.fluency_session import FluencySession, WordError
from app.models.vocabulary import VocabularyWord
from app.models.student import Student
from app.schemas.spelling import (
    CreateSessionRequest, SubmitAttemptRequest,
    SpellingWordOut, CreateSessionOut, AttemptResultOut, SpellingStatsOut, SpellingSessionOut,
)
from app.data.spelling_words import get_grade_words
import uuid

router = APIRouter(prefix="/spelling", tags=["spelling"])

MASTERY_THRESHOLD = 3   # correct answers to mark a word mastered
XP_PER_CORRECT   = 5
XP_MASTERY_BONUS = 10
XP_ROUND_BONUS   = 20   # awarded when a session is completed


# ── GET /spelling/words ───────────────────────────────────────────────────────


@router.get("/words", response_model=List[SpellingWordOut])
async def get_spelling_words(
    limit: int = 10,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return a pool of words for the student: missed words + vocabulary, unmastered first."""

    # Fetch already-mastered words so we can deprioritize them
    mastered_q = await db.execute(
        select(WordMastery.word, WordMastery.mastered)
        .where(WordMastery.student_id == x_student_id)
    )
    mastery_map: dict[str, bool] = {r.word.lower(): r.mastered for r in mastered_q}

    words: list[SpellingWordOut] = []

    # 1. Missed words from fluency sessions (word_errors)
    session_q = await db.execute(
        select(FluencySession.id).where(FluencySession.student_id == x_student_id)
    )
    session_ids = [r.id for r in session_q]

    if session_ids:
        error_q = await db.execute(
            select(WordError.word)
            .where(WordError.session_id.in_(session_ids))
            .distinct()
        )
        for row in error_q:
            w = row.word.strip().lower()
            if w and w not in {x.word.lower() for x in words}:
                words.append(SpellingWordOut(
                    word=row.word.strip(),
                    definition=None,
                    example_sentence=None,
                    source="error",
                    mastered=mastery_map.get(w, False),
                ))

    # 2. Vocabulary bank words (student-specific + shared catalog)
    vocab_q = await db.execute(
        select(VocabularyWord)
        .where(
            (VocabularyWord.student_id == x_student_id) |
            (VocabularyWord.student_id == None)
        )
        .limit(50)
    )
    existing_words_lower = {x.word.lower() for x in words}
    for vw in vocab_q.scalars():
        w = vw.word.strip().lower()
        if w and w not in existing_words_lower:
            words.append(SpellingWordOut(
                word=vw.word.strip(),
                definition=vw.definition,
                example_sentence=vw.example_sentence,
                source="vocabulary",
                mastered=mastery_map.get(w, False),
            ))
            existing_words_lower.add(w)

    # Sort: unmastered first, then mastered (for review)
    words.sort(key=lambda w: (w.mastered, w.word))

    return words[:limit]


# ── GET /spelling/grade-words ─────────────────────────────────────────────────

@router.get("/grade-words", response_model=List[SpellingWordOut])
async def get_grade_level_words(
    limit: int = 10,
    grade: Optional[int] = None,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return grade-appropriate spelling words from the curated word bank.
    If grade is not provided, looks up the student's grade level."""

    grade_level = grade
    if grade_level is None:
        student_q = await db.execute(
            select(Student.grade_level).where(Student.id == x_student_id)
        )
        row = student_q.first()
        grade_level = row.grade_level if row else 2

    # Fetch mastery info to mark already-mastered words
    mastered_q = await db.execute(
        select(WordMastery.word, WordMastery.mastered)
        .where(WordMastery.student_id == x_student_id)
    )
    mastery_map = {r.word.lower(): r.mastered for r in mastered_q}

    raw_words = get_grade_words(grade_level, limit)
    result = []
    for w in raw_words:
        result.append(SpellingWordOut(
            word=w["word"],
            definition=w.get("definition"),
            example_sentence=None,
            source="grade",
            mastered=mastery_map.get(w["word"].lower(), False),
        ))
    return result


# ── POST /spelling/sessions ───────────────────────────────────────────────────


@router.post("/sessions", response_model=CreateSessionOut)
async def create_session(
    body: CreateSessionRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Create a new spelling game session."""
    session = SpellingSession(
        id=str(uuid.uuid4()),
        student_id=x_student_id,
        character_name=body.character_name,
        total_words=body.total_words,
    )
    db.add(session)
    await db.commit()
    return CreateSessionOut(session_id=session.id)


# ── POST /spelling/attempts ───────────────────────────────────────────────────

@router.post("/attempts", response_model=AttemptResultOut)
async def submit_attempt(
    body: SubmitAttemptRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Submit a spelling attempt. Awards XP and updates word mastery."""
    correct_answer = body.word.strip()
    is_correct = body.student_answer.strip().lower() == correct_answer.lower()

    # Record attempt
    attempt = SpellingAttempt(
        id=str(uuid.uuid4()),
        session_id=body.session_id,
        word=correct_answer,
        game_mode=body.game_mode,
        student_answer=body.student_answer.strip(),
        is_correct=is_correct,
        attempt_number=body.attempt_number,
    )
    db.add(attempt)

    # Upsert WordMastery
    mastery_q = await db.execute(
        select(WordMastery)
        .where(WordMastery.student_id == x_student_id, WordMastery.word == correct_answer.lower())
    )
    mastery = mastery_q.scalar_one_or_none()
    newly_mastered = False

    if mastery is None:
        mastery = WordMastery(
            id=str(uuid.uuid4()),
            student_id=x_student_id,
            word=correct_answer.lower(),
            correct_count=1 if is_correct else 0,
            attempt_count=1,
            mastered=False,
        )
        db.add(mastery)
    else:
        mastery.attempt_count += 1
        if is_correct:
            mastery.correct_count += 1
        mastery.last_practiced_at = datetime.utcnow()

    if is_correct and not mastery.mastered and mastery.correct_count >= MASTERY_THRESHOLD:
        mastery.mastered = True
        newly_mastered = True

    # Calculate XP
    xp = 0
    if is_correct:
        xp += XP_PER_CORRECT
    if newly_mastered:
        xp += XP_MASTERY_BONUS

    # Update session totals
    session_q = await db.execute(select(SpellingSession).where(SpellingSession.id == body.session_id))
    sp_session = session_q.scalar_one_or_none()
    if sp_session:
        if is_correct:
            sp_session.correct_count += 1
        sp_session.xp_earned += xp

        # Check if round completed (all words attempted once each)
        attempts_q = await db.execute(
            select(func.count()).where(SpellingAttempt.session_id == body.session_id)
        )
        total_attempts = attempts_q.scalar_one()
        if total_attempts >= sp_session.total_words and sp_session.completed_at is None:
            sp_session.completed_at = datetime.utcnow()
            sp_session.xp_earned += XP_ROUND_BONUS
            xp += XP_ROUND_BONUS

    await db.commit()

    return AttemptResultOut(
        is_correct=is_correct,
        correct_answer=correct_answer,
        mastered=mastery.mastered,
        newly_mastered=newly_mastered,
        xp_awarded=xp,
    )


# ── GET /spelling/stats ───────────────────────────────────────────────────────

@router.get("/stats", response_model=SpellingStatsOut)
async def get_stats(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Get the student's overall spelling statistics."""
    sessions_q = await db.execute(
        select(func.count()).where(SpellingSession.student_id == x_student_id)
    )
    total_sessions = sessions_q.scalar_one()

    mastered_q = await db.execute(
        select(func.count()).where(
            WordMastery.student_id == x_student_id,
            WordMastery.mastered == True,
        )
    )
    words_mastered = mastered_q.scalar_one()

    # Aggregate attempt counts by joining through sessions
    session_ids_q = await db.execute(
        select(SpellingSession.id).where(SpellingSession.student_id == x_student_id)
    )
    session_ids = [r.id for r in session_ids_q]

    total_attempts = 0
    correct_attempts = 0
    if session_ids:
        total_q = await db.execute(
            select(func.count()).where(SpellingAttempt.session_id.in_(session_ids))
        )
        total_attempts = total_q.scalar_one()

        correct_q = await db.execute(
            select(func.count()).where(
                SpellingAttempt.session_id.in_(session_ids),
                SpellingAttempt.is_correct == True,
            )
        )
        correct_attempts = correct_q.scalar_one()

    accuracy_pct = round((correct_attempts / total_attempts * 100), 1) if total_attempts > 0 else 0.0

    return SpellingStatsOut(
        total_sessions=total_sessions,
        words_mastered=words_mastered,
        total_attempts=total_attempts,
        correct_attempts=correct_attempts,
        accuracy_pct=accuracy_pct,
    )


# ── GET /spelling/history ─────────────────────────────────────

@router.get("/history", response_model=List[SpellingSessionOut])
async def get_history(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return all completed spelling sessions for a student, newest first,
    including the list of words the student got wrong in each session."""
    sessions_q = await db.execute(
        select(SpellingSession)
        .where(SpellingSession.student_id == x_student_id)
        .order_by(SpellingSession.started_at.desc())
        .limit(50)
    )
    sessions = sessions_q.scalars().all()

    result = []
    for s in sessions:
        accuracy = round((s.correct_count / s.total_words * 100), 1) if s.total_words > 0 else 0.0

        # Collect distinct words that were attempted but never answered correctly
        # (any attempt where is_correct=False and the word was NOT correctly answered later)
        attempts_q = await db.execute(
            select(SpellingAttempt.word, SpellingAttempt.is_correct)
            .where(SpellingAttempt.session_id == s.id)
            .order_by(SpellingAttempt.word)
        )
        attempts = attempts_q.all()
        correct_words = {a.word.lower() for a in attempts if a.is_correct}
        missed_words = sorted({a.word for a in attempts if not a.is_correct and a.word.lower() not in correct_words})

        result.append(SpellingSessionOut(
            session_id=s.id,
            character_name=s.character_name,
            total_words=s.total_words,
            correct_count=s.correct_count,
            accuracy_pct=accuracy,
            xp_earned=s.xp_earned,
            completed_at=s.completed_at,
            started_at=s.started_at,
            missed_words=missed_words,
        ))
    return result


# ── GET /spelling/sessions/{session_id}/missed-words ──────────────────────────

@router.get("/sessions/{session_id}/missed-words")
async def get_missed_words(
    session_id: str,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return the list of words that were not answered correctly in a session."""
    # Verify ownership
    session_q = await db.execute(
        select(SpellingSession)
        .where(SpellingSession.id == session_id, SpellingSession.student_id == x_student_id)
    )
    session = session_q.scalar_one_or_none()
    if session is None:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Session not found")

    attempts_q = await db.execute(
        select(SpellingAttempt.word, SpellingAttempt.is_correct)
        .where(SpellingAttempt.session_id == session_id)
    )
    attempts = attempts_q.all()
    correct_words = {a.word.lower() for a in attempts if a.is_correct}
    missed_words = sorted({a.word for a in attempts if not a.is_correct and a.word.lower() not in correct_words})

    return {"session_id": session_id, "missed_words": missed_words}
