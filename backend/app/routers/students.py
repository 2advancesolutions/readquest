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
            school=s.school, created_at=str(s.created_at)
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
