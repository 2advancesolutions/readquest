"""Parents router — profile CRUD + Parent Dashboard for AI Tutor monitoring."""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.parent import Parent
from app.models.student import Student
from app.models.fluency_session import FluencySession
from app.models.assignment import Assignment
from app.models.parent_review import ParentReview

router = APIRouter()


class CreateParentRequest(BaseModel):
    id: str  # Matches the auth.users id
    first_name: str
    last_name: str


class StarGradeRequest(BaseModel):
    parent_id: str
    student_id: str
    star_grade: int          # 1-5
    comment: Optional[str] = None
    assignment_id: Optional[str] = None
    fluency_session_id: Optional[str] = None


class ParentResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    created_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=ParentResponse)
async def create_parent(req: CreateParentRequest, db: AsyncSession = Depends(get_session)):
    existing = await db.execute(select(Parent).where(Parent.id == req.id))
    parent = existing.scalar_one_or_none()
    if parent:
        parent.first_name = req.first_name
        parent.last_name = req.last_name
    else:
        parent = Parent(id=req.id, first_name=req.first_name, last_name=req.last_name)
        db.add(parent)
    await db.commit()
    await db.refresh(parent)
    return ParentResponse(
        id=parent.id, first_name=parent.first_name,
        last_name=parent.last_name, created_at=str(parent.created_at)
    )


@router.get("/{parent_id}", response_model=ParentResponse)
async def get_parent(parent_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(404, detail="Parent not found")
    return ParentResponse(
        id=parent.id, first_name=parent.first_name,
        last_name=parent.last_name, created_at=str(parent.created_at)
    )


@router.get("/dashboard/{parent_id}")
async def get_parent_dashboard(
    parent_id: str,
    db: AsyncSession = Depends(get_session),
):
    """
    Aggregated parent dashboard: for each child, return recent fluency stats,
    pending assignments, and whether any reviews are needed.
    """
    # Get all children of this parent
    kids_r = await db.execute(
        select(Student).where(Student.parent_id == parent_id)
    )
    kids = kids_r.scalars().all()
    if not kids:
        return {"children": []}

    dashboard = []
    for kid in kids:
        # Recent fluency summary (last 5 sessions)
        sessions_r = await db.execute(
            select(FluencySession)
            .where(FluencySession.student_id == kid.id)
            .order_by(FluencySession.recorded_at.desc())
            .limit(5)
        )
        sessions = sessions_r.scalars().all()
        avg_accuracy = (
            sum(s.accuracy_pct for s in sessions) / len(sessions)
            if sessions else None
        )
        avg_wpm = None
        if sessions:
            wpms = [s.words_per_minute for s in sessions if s.words_per_minute]
            avg_wpm = sum(wpms) / len(wpms) if wpms else None

        # Pending assignments (not yet reviewed)
        pending_r = await db.execute(
            select(Assignment)
            .where(Assignment.student_id == kid.id)
            .where(Assignment.status.in_(["completed", "pending"]))
            .order_by(Assignment.created_at.desc())
            .limit(5)
        )
        pending = pending_r.scalars().all()

        # Recent parent reviews
        reviews_r = await db.execute(
            select(ParentReview)
            .where(ParentReview.student_id == kid.id)
            .order_by(ParentReview.reviewed_at.desc())
            .limit(3)
        )
        reviews = reviews_r.scalars().all()

        dashboard.append({
            "student_id": kid.id,
            "name": kid.name,
            "grade_level": kid.grade_level,
            "avatar_url": kid.avatar_url,
            "fluency_summary": {
                "session_count": len(sessions),
                "avg_accuracy_pct": round(avg_accuracy, 1) if avg_accuracy else None,
                "avg_wpm": round(avg_wpm, 1) if avg_wpm else None,
                "recent_sessions": [
                    {
                        "session_id": s.id,
                        "story_id": s.story_id,
                        "page_number": s.page_number,
                        "accuracy_pct": s.accuracy_pct,
                        "words_per_minute": s.words_per_minute,
                        "feedback": s.feedback,
                        "recorded_at": str(s.recorded_at),
                    }
                    for s in sessions
                ],
            },
            "assignments": [
                {
                    "id": a.id,
                    "title": a.title,
                    "status": a.status,
                    "assignment_type": a.assignment_type,
                    "created_at": str(a.created_at),
                }
                for a in pending
            ],
            "recent_reviews": [
                {
                    "id": r.id,
                    "star_grade": r.star_grade,
                    "comment": r.comment,
                    "assignment_id": r.assignment_id,
                    "reviewed_at": str(r.reviewed_at),
                }
                for r in reviews
            ],
        })

    return {"children": dashboard}


@router.post("/review")
async def submit_star_grade(
    req: StarGradeRequest,
    db: AsyncSession = Depends(get_session),
):
    """
    Parent submits a Star Grade (1-5) on a child's reading session or assignment.
    This appears in the child's dashboard as encouragement.
    """
    if not 1 <= req.star_grade <= 5:
        raise HTTPException(400, "star_grade must be between 1 and 5")

    db.add(ParentReview(
        parent_id=req.parent_id,
        student_id=req.student_id,
        assignment_id=req.assignment_id,
        fluency_session_id=req.fluency_session_id,
        star_grade=req.star_grade,
        comment=req.comment,
    ))

    # If reviewing an assignment, update its status
    if req.assignment_id:
        assignment_r = await db.execute(
            select(Assignment).where(Assignment.id == req.assignment_id)
        )
        assignment = assignment_r.scalar_one_or_none()
        if assignment:
            assignment.status = "reviewed"

    await db.commit()
    return {"submitted": True, "star_grade": req.star_grade}


@router.get("/reviews/{student_id}")
async def get_student_reviews(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get all parent reviews for a student — shown in child's dashboard for motivation."""
    result = await db.execute(
        select(ParentReview)
        .where(ParentReview.student_id == student_id)
        .order_by(ParentReview.reviewed_at.desc())
        .limit(20)
    )
    reviews = result.scalars().all()
    return [
        {
            "id": r.id,
            "star_grade": r.star_grade,
            "comment": r.comment,
            "assignment_id": r.assignment_id,
            "fluency_session_id": r.fluency_session_id,
            "reviewed_at": str(r.reviewed_at),
        }
        for r in reviews
    ]

