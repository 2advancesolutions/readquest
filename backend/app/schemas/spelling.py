"""Pydantic schemas for the Spelling Arena API."""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Request schemas ───────────────────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    character_name: str
    total_words: int = 10


class SubmitAttemptRequest(BaseModel):
    session_id: str
    word: str
    game_mode: str          # 'bee' | 'blanks' | 'scramble'
    student_answer: str
    attempt_number: int = 1


# ── Response schemas ──────────────────────────────────────────────────────────

class SpellingWordOut(BaseModel):
    word: str
    definition: Optional[str] = None
    example_sentence: Optional[str] = None
    source: str             # 'error' | 'vocabulary' | 'grade'
    mastered: bool = False


class CreateSessionOut(BaseModel):
    session_id: str


class AttemptResultOut(BaseModel):
    is_correct: bool
    correct_answer: str
    mastered: bool
    newly_mastered: bool    # True if this attempt caused mastery
    xp_awarded: int


class SpellingStatsOut(BaseModel):
    total_sessions: int
    words_mastered: int
    total_attempts: int
    correct_attempts: int
    accuracy_pct: float


class SpellingSessionOut(BaseModel):
    session_id: str
    character_name: str
    total_words: int
    correct_count: int
    accuracy_pct: float
    xp_earned: int
    completed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    missed_words: list[str] = []   # words the student got wrong in this session
