"""Students router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.database import get_session
from app.models.student import Student

router = APIRouter()

class CreateStudentRequest(BaseModel):
    id: Optional[str] = None # Will be supplied if signing up child via auth.users
    parent_id: Optional[str] = None
    name: str
    grade_level: int
    school: Optional[str] = None

class StudentResponse(BaseModel):
    id: str
    parent_id: Optional[str] = None
    name: str
    grade_level: int
    school: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True

@router.post("", response_model=StudentResponse)
async def create_student(req: CreateStudentRequest, db: AsyncSession = Depends(get_session)):
    try:
        student = Student(
            id=req.id if req.id else str(__import__('uuid').uuid4()),
            parent_id=req.parent_id,
            name=req.name,
            grade_level=req.grade_level,
            school=req.school
        )

        db.add(student)
        await db.commit()
        await db.refresh(student)
        return StudentResponse(
            id=student.id,
            parent_id=student.parent_id,
            name=student.name,
            grade_level=student.grade_level,
            school=student.school,
            avatar_url=student.avatar_url,
            created_at=str(student.created_at)
        )
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=f"Failed to create student: {str(e)}")

@router.get("/parent/{parent_id}", response_model=List[StudentResponse])
async def get_students_by_parent(parent_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Student).where(Student.parent_id == parent_id))
    students = result.scalars().all()
    return [
        StudentResponse(
            id=s.id, parent_id=s.parent_id, name=s.name, grade_level=s.grade_level,
            school=s.school, avatar_url=s.avatar_url, created_at=str(s.created_at)
        ) for s in students
    ]

@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, detail="Student not found")
    return StudentResponse(
        id=student.id, parent_id=student.parent_id, name=student.name,
        grade_level=student.grade_level, school=student.school,
        created_at=str(student.created_at)
    )
class UpdateAvatarRequest(BaseModel):
    avatar_url: str

@router.patch("/{student_id}/avatar")
async def update_student_avatar(student_id: str, req: UpdateAvatarRequest, db: AsyncSession = Depends(get_session)):
    """Save a generated avatar URL for a student."""
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, detail="Student not found")
    student.avatar_url = req.avatar_url
    await db.commit()
    return {"avatar_url": student.avatar_url}

class UpdateStudentRequest(BaseModel):
    name: Optional[str] = None
    grade_level: Optional[int] = None
    school: Optional[str] = None

@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(student_id: str, req: UpdateStudentRequest, db: AsyncSession = Depends(get_session)):
    """Update a student's name, grade, and/or school."""
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, detail="Student not found")
    if req.name is not None:
        student.name = req.name.strip()
    if req.grade_level is not None:
        student.grade_level = req.grade_level
    if req.school is not None:
        student.school = req.school.strip() or None
    await db.commit()
    await db.refresh(student)
    return StudentResponse(
        id=student.id, parent_id=student.parent_id, name=student.name,
        grade_level=student.grade_level, school=student.school,
        avatar_url=student.avatar_url, created_at=str(student.created_at)
    )
