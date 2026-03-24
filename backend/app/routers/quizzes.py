"""Quizzes router"""
from fastapi import APIRouter, Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_session
from app.models.quiz import QuizQuestion, QuizAttempt
from app.services.gamification_service import award_xp

router = APIRouter()


class SubmitAnswerRequest(BaseModel):
    answer: str


@router.post("/{question_id}/submit")
async def submit_answer(
    question_id: str,
    req: SubmitAnswerRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session)
):
    result = await db.execute(select(QuizQuestion).where(QuizQuestion.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        return {"correct": False, "xp_awarded": 3}

    is_correct = req.answer.strip().lower() == question.correct_answer.strip().lower()

    attempt = QuizAttempt(
        student_id=x_student_id,
        question_id=question_id,
        answer=req.answer,
        is_correct=is_correct,
    )
    db.add(attempt)
    await db.commit()

    xp = 10 if is_correct else 3
    reason = "quiz_correct" if is_correct else "quiz_attempt"
    await award_xp(db, x_student_id, xp, reason)

    return {
        "correct": is_correct,
        "correct_answer": question.correct_answer,
        "explanation": question.explanation,
        "xp_awarded": xp,
    }
