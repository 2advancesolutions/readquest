"""Parents router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.parent import Parent

router = APIRouter()

class CreateParentRequest(BaseModel):
    id: str  # Matches the auth.users id
    first_name: str
    last_name: str

class ParentResponse(BaseModel):
    id: str
    first_name: str
    last_name: str
    created_at: str

    class Config:
        from_attributes = True

@router.post("", response_model=ParentResponse)
async def create_parent(req: CreateParentRequest, db: AsyncSession = Depends(get_session)):
    # Check if parent already exists (idempotent upsert)
    existing = await db.execute(select(Parent).where(Parent.id == req.id))
    parent = existing.scalar_one_or_none()
    if parent:
        # Update name in case it changed
        parent.first_name = req.first_name
        parent.last_name = req.last_name
    else:
        parent = Parent(id=req.id, first_name=req.first_name, last_name=req.last_name)
        db.add(parent)
    await db.commit()
    await db.refresh(parent)
    return ParentResponse(id=parent.id, first_name=parent.first_name, last_name=parent.last_name, created_at=str(parent.created_at))

@router.get("/{parent_id}", response_model=ParentResponse)
async def get_parent(parent_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Parent).where(Parent.id == parent_id))
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(404, detail="Parent not found")
    return ParentResponse(id=parent.id, first_name=parent.first_name, last_name=parent.last_name, created_at=str(parent.created_at))
