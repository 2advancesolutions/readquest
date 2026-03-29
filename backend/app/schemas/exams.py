"""Pydantic schemas for the Reading Exam Center API."""
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


# ── Request schemas ───────────────────────────────────────────────────────────

class GenerateExamRequest(BaseModel):
    grade_level: int          # 0=K, 1–6
    section: str              # 'phonics'|'vocabulary'|'comprehension'|'grammar'|'mixed'
    is_practice: bool = False # 15Q / 10 min warmup


class SubmitExamRequest(BaseModel):
    exam_id: str
    answers: Dict[str, List[str]]   # {question_id: ["A"] or ["A","C"]}
    time_taken_sec: Optional[int] = None
    started_at: Optional[str] = None
    is_practice: bool = False


class ResetProgressRequest(BaseModel):
    grade_level: int


# ── Response schemas ──────────────────────────────────────────────────────────

class ExamQuestionOut(BaseModel):
    id: str
    question_number: int
    strand: str
    question_type: str
    passage: Optional[str] = None
    question_text: str
    choices: List[str]
    difficulty: str
    # correct_answers intentionally omitted — only returned after submission


class ExamOut(BaseModel):
    exam_id: str
    grade_level: int
    section: str
    is_practice: bool
    total_questions: int
    time_limit_sec: int
    exam_difficulty: str
    questions: List[ExamQuestionOut]


class QuestionResult(BaseModel):
    question_id: str
    question_number: int
    question_text: str
    passage: Optional[str] = None
    choices: List[str]
    student_answers: List[str]
    correct_answers: List[str]
    is_correct: bool
    explanation: Optional[str] = None
    strand: str


class ExamResultOut(BaseModel):
    attempt_id: str
    exam_id: str
    grade_level: int
    section: str
    is_practice: bool
    exam_number: int
    retake_number: int
    retakes_remaining: int
    correct_count: int
    total_questions: int
    score_pct: float
    passed: bool
    xp_earned: int
    time_taken_sec: Optional[int]
    reset_triggered: bool
    results: List[QuestionResult]


class ExamHistoryItem(BaseModel):
    attempt_id: str
    exam_id: str
    grade_level: int
    section: str
    section_label: str
    is_practice: bool
    exam_number: int
    retake_number: int
    score_pct: float
    correct_count: int
    total_questions: int
    passed: bool
    xp_earned: int
    time_taken_sec: Optional[int]
    completed_at: str


class SectionStatus(BaseModel):
    """Retake + pass status for one section in a grade."""
    section: str
    section_label: str
    passed: bool
    best_score: float
    total_attempts: int    # real attempts (not practice)
    retake_number: int     # how many retakes used (0=first try, 1=1st retake, 2=2nd retake)
    retakes_remaining: int


class GradeReadinessOut(BaseModel):
    student_grade: int
    total_passed_exams: int
    required_exams: int                   # 10
    required_books: int                   # 60
    books_read: int
    overall_avg_score: float
    required_avg: float                   # 80.0
    sections: List[SectionStatus]
    any_section_maxed_retakes: bool       # True if ANY section used all retakes and still failed
    ready_for_next_grade: bool
    promoted_grade: Optional[int]
