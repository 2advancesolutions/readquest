"""
Assignments router — AI-generated and parent-created learning tasks.
"""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.assignment import Assignment, AssignmentResult
from app.models.parent_review import ParentReview

router = APIRouter()


class GenerateAssignmentRequest(BaseModel):
    """Empty body — all performance data pulled from DB automatically."""
    pass


class SubmitAssignmentRequest(BaseModel):
    answers: dict  # {task_index: answer_value}


class ReviewAssignmentRequest(BaseModel):
    star_grade: int     # 1-5
    comment: Optional[str] = None
    parent_id: str


@router.post("/generate/{student_id}")
async def generate_assignment(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """
    Auto-generate a personalized assignment for a student.
    Pulls recent fluency + quiz data from the DB to inform the AI.
    """
    from app.agents.assignment_agent import run_assignment_agent
    from app.models.fluency_session import WordError, FluencySession
    from app.models.quiz import QuizAttempt
    from app.models.student import Student
    from sqlalchemy import func

    # Get student grade level
    stu_r = await db.execute(select(Student).where(Student.id == student_id))
    student = stu_r.scalar_one_or_none()
    if not student:
        raise HTTPException(404, "Student not found")

    # Get recent fluency summary
    sessions_r = await db.execute(
        select(FluencySession)
        .where(FluencySession.student_id == student_id)
        .order_by(FluencySession.recorded_at.desc())
        .limit(10)
    )
    sessions = sessions_r.scalars().all()
    avg_accuracy = sum(s.accuracy_pct for s in sessions) / len(sessions) if sessions else 70.0

    # Get top word errors
    session_ids = [s.id for s in sessions]
    word_errors_list = []
    if session_ids:
        errors_r = await db.execute(
            select(WordError.word, WordError.error_type, func.count(WordError.word).label("cnt"))
            .where(WordError.session_id.in_(session_ids))
            .group_by(WordError.word, WordError.error_type)
            .order_by(func.count(WordError.word).desc())
            .limit(10)
        )
        word_errors_list = [{"word": r[0], "error_type": r[1]} for r in errors_r.all()]

    # Get recent quiz stats
    attempts_r = await db.execute(
        select(QuizAttempt)
        .where(QuizAttempt.student_id == student_id)
        .order_by(QuizAttempt.id.desc())
        .limit(20)
    )
    attempts = attempts_r.scalars().all()
    avg_quiz = (sum(1 for a in attempts if a.is_correct) / len(attempts) * 100) if attempts else 70.0

    # Run assignment agent
    assignment_data = await run_assignment_agent(
        student_id=student_id,
        grade_level=student.grade_level,
        recent_word_errors=word_errors_list,
        avg_accuracy_pct=avg_accuracy,
        avg_quiz_score=avg_quiz,
    )

    # Save to DB
    assignment = Assignment(
        student_id=student_id,
        title=assignment_data["title"],
        description=assignment_data["description"],
        assignment_type=assignment_data["assignment_type"],
        content=assignment_data["content"],
        source="ai_generated",
        difficulty_level=assignment_data["difficulty_level"],
        status="pending",
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)

    return {
        "id": assignment.id,
        "student_id": student_id,
        "title": assignment.title,
        "description": assignment.description,
        "assignment_type": assignment.assignment_type,
        "content": assignment.content,
        "difficulty_level": assignment.difficulty_level,
        "status": assignment.status,
        "created_at": str(assignment.created_at),
    }


@router.get("/{student_id}")
async def list_assignments(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """List all assignments for a student, newest first."""
    result = await db.execute(
        select(Assignment)
        .where(Assignment.student_id == student_id)
        .order_by(Assignment.created_at.desc())
    )
    assignments = result.scalars().all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "assignment_type": a.assignment_type,
            "status": a.status,
            "difficulty_level": a.difficulty_level,
            "source": a.source,
            "created_at": str(a.created_at),
        }
        for a in assignments
    ]


@router.get("/detail/{assignment_id}")
async def get_assignment(
    assignment_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get full assignment including tasks."""
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")
    return {
        "id": assignment.id,
        "student_id": assignment.student_id,
        "title": assignment.title,
        "description": assignment.description,
        "assignment_type": assignment.assignment_type,
        "content": assignment.content,
        "status": assignment.status,
        "difficulty_level": assignment.difficulty_level,
        "source": assignment.source,
        "created_at": str(assignment.created_at),
    }


@router.post("/{assignment_id}/submit")
async def submit_assignment(
    assignment_id: str,
    req: SubmitAssignmentRequest,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session),
):
    """Submit student answers for an assignment and compute a score."""
    if not x_student_id:
        raise HTTPException(400, "x-student-id header required")

    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    # Score the submission
    tasks = assignment.content if isinstance(assignment.content, list) else []
    correct = 0
    gradable = 0
    for i, task in enumerate(tasks):
        answer = req.answers.get(str(i))
        correct_answer = task.get("correct_answer")
        if correct_answer is not None and answer is not None:
            gradable += 1
            if str(answer).strip().lower() == str(correct_answer).strip().lower():
                correct += 1

    score_pct = round((correct / gradable * 100) if gradable > 0 else 100.0, 1)

    # Save result
    db.add(AssignmentResult(
        assignment_id=assignment_id,
        student_id=x_student_id,
        answers=req.answers,
        score_pct=score_pct,
        completed_at=datetime.utcnow(),
    ))

    # Update assignment status
    assignment.status = "completed"
    await db.commit()

    return {
        "assignment_id": assignment_id,
        "score_pct": score_pct,
        "correct": correct,
        "gradable": gradable,
        "status": "completed",
    }


@router.post("/{assignment_id}/review")
async def review_assignment(
    assignment_id: str,
    req: ReviewAssignmentRequest,
    db: AsyncSession = Depends(get_session),
):
    """Parent submits a star grade and optional comment on a completed assignment."""
    if not 1 <= req.star_grade <= 5:
        raise HTTPException(400, "star_grade must be 1-5")

    assignment_r = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = assignment_r.scalar_one_or_none()
    if not assignment:
        raise HTTPException(404, "Assignment not found")

    db.add(ParentReview(
        parent_id=req.parent_id,
        student_id=assignment.student_id,
        assignment_id=assignment_id,
        star_grade=req.star_grade,
        comment=req.comment,
    ))
    assignment.status = "reviewed"
    await db.commit()

    return {"reviewed": True, "star_grade": req.star_grade}
