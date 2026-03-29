"""
Fluency router — analyze reading fluency from Web Speech API transcript.
Privacy-first: receives text transcript, source text, and duration — no audio.
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.fluency_session import FluencySession, WordError
from app.agents.fluency_agent import run_fluency_agent

router = APIRouter()


class FluencyAnalyzeRequest(BaseModel):
    story_id: str
    page_number: int
    transcript: str       # Text from Web Speech API — no audio stored
    source_text: str      # The expected story page text
    duration_secs: float  # How long the child took to read


class WordErrorResponse(BaseModel):
    word: str
    spoken_word: Optional[str] = None
    error_type: str
    word_index: int


class FluencySessionResponse(BaseModel):
    session_id: str
    student_id: str
    story_id: str
    page_number: int
    accuracy_pct: float
    words_per_minute: Optional[float] = None
    correct_words: int
    total_words: int
    word_errors: list[WordErrorResponse]
    feedback: str
    recorded_at: str


@router.post("/analyze", response_model=FluencySessionResponse)
async def analyze_fluency(
    req: FluencyAnalyzeRequest,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session),
):
    """
    Analyze reading fluency from Web Speech API transcript.
    Stores only text-based metrics — no audio data.
    """
    if not x_student_id:
        raise HTTPException(400, "x-student-id header required")
    if not req.transcript.strip():
        raise HTTPException(400, "transcript cannot be empty")
    if not req.source_text.strip():
        raise HTTPException(400, "source_text cannot be empty")

    # Run fluency agent — pure text analysis
    result = await run_fluency_agent(
        student_id=x_student_id,
        story_id=req.story_id,
        page_number=req.page_number,
        transcript=req.transcript,
        source_text=req.source_text,
        duration_secs=req.duration_secs,
    )

    # Persist session metrics (no audio)
    session = FluencySession(
        student_id=x_student_id,
        story_id=req.story_id,
        page_number=req.page_number,
        words_per_minute=result["words_per_minute"],
        accuracy_pct=result["accuracy_pct"],
        total_words=result["total_words"],
        correct_words=result["correct_words"],
        feedback=result["feedback"],
        recorded_at=datetime.utcnow(),
    )
    db.add(session)
    await db.flush()

    # Persist word errors
    for err in result["word_errors"]:
        db.add(WordError(
            session_id=session.id,
            word=err["word"],
            spoken_word=err.get("spoken_word"),
            error_type=err["error_type"],
            word_index=err["word_index"],
        ))

    await db.commit()
    await db.refresh(session)

    return FluencySessionResponse(
        session_id=session.id,
        student_id=x_student_id,
        story_id=req.story_id,
        page_number=req.page_number,
        accuracy_pct=result["accuracy_pct"],
        words_per_minute=result["words_per_minute"],
        correct_words=result["correct_words"],
        total_words=result["total_words"],
        word_errors=[WordErrorResponse(**e) for e in result["word_errors"]],
        feedback=result["feedback"],
        recorded_at=str(session.recorded_at),
    )


@router.get("/sessions/{student_id}")
async def list_fluency_sessions(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """List all fluency reading sessions for a student."""
    result = await db.execute(
        select(FluencySession)
        .where(FluencySession.student_id == student_id)
        .order_by(FluencySession.recorded_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "session_id": s.id,
            "story_id": s.story_id,
            "page_number": s.page_number,
            "accuracy_pct": s.accuracy_pct,
            "words_per_minute": s.words_per_minute,
            "correct_words": s.correct_words,
            "total_words": s.total_words,
            "feedback": s.feedback,
            "recorded_at": str(s.recorded_at),
        }
        for s in sessions
    ]


@router.get("/session/{session_id}/errors")
async def get_session_errors(
    session_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get word errors for a specific session (for parent dashboard and vocabulary panel)."""
    result = await db.execute(
        select(WordError)
        .where(WordError.session_id == session_id)
        .order_by(WordError.word_index)
    )
    errors = result.scalars().all()
    return [
        {
            "word": e.word,
            "spoken_word": e.spoken_word,
            "error_type": e.error_type,
            "word_index": e.word_index,
        }
        for e in errors
    ]


@router.get("/summary/{student_id}")
async def get_fluency_summary(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """
    Aggregate fluency stats for a student — used by assignment agent and parent dashboard.
    Returns avg accuracy, avg WPM, and top repeated error words.
    """
    from sqlalchemy import func

    # Last 20 sessions
    sessions_r = await db.execute(
        select(FluencySession)
        .where(FluencySession.student_id == student_id)
        .order_by(FluencySession.recorded_at.desc())
        .limit(20)
    )
    sessions = sessions_r.scalars().all()
    if not sessions:
        return {"avg_accuracy_pct": 0, "avg_wpm": None, "top_error_words": [], "session_count": 0}

    session_ids = [s.id for s in sessions]
    avg_accuracy = sum(s.accuracy_pct for s in sessions) / len(sessions)
    wpms = [s.words_per_minute for s in sessions if s.words_per_minute]
    avg_wpm = sum(wpms) / len(wpms) if wpms else None

    # Get top repeated error words
    errors_r = await db.execute(
        select(WordError.word, func.count(WordError.word).label("cnt"))
        .where(WordError.session_id.in_(session_ids))
        .group_by(WordError.word)
        .order_by(func.count(WordError.word).desc())
        .limit(10)
    )
    top_errors = [{"word": r[0], "error_count": r[1], "error_type": "mispronounced"} for r in errors_r.all()]

    return {
        "avg_accuracy_pct": round(avg_accuracy, 1),
        "avg_wpm": round(avg_wpm, 1) if avg_wpm else None,
        "top_error_words": top_errors,
        "session_count": len(sessions),
    }
