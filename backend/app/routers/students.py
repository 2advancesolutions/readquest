"""Students router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.student import Student

router = APIRouter()


class CreateStudentRequest(BaseModel):
    name: str
    grade_level: int


class StudentResponse(BaseModel):
    id: str
    name: str
    grade_level: int
    avatar_url: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.post("", response_model=StudentResponse)
async def create_student(req: CreateStudentRequest, db: AsyncSession = Depends(get_session)):
    student = Student(name=req.name, grade_level=req.grade_level)
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return StudentResponse(id=student.id, name=student.name, grade_level=student.grade_level, created_at=str(student.created_at))


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(student_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Student).where(Student.id == student_id))
    student = result.scalar_one_or_none()
    if not student:
        raise HTTPException(404, detail="Student not found")
    return StudentResponse(id=student.id, name=student.name, grade_level=student.grade_level, created_at=str(student.created_at))
