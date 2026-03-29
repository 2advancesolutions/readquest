"""Reading Exam Center router — generate, submit, history, readiness, review, reset."""
import json
import uuid
import asyncio
from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.database import get_session
from app.config import settings
from app.models.exam import ReadingExam, ReadingExamQuestion, ReadingExamAttempt
from app.models.student import Student
from app.models.story import Story              # for books-read count
from app.schemas.exams import (
    GenerateExamRequest, SubmitExamRequest, ResetProgressRequest,
    ExamOut, ExamQuestionOut, ExamResultOut, QuestionResult,
    ExamHistoryItem, GradeReadinessOut, SectionStatus,
)
from app.services.gamification_service import award_xp

router = APIRouter()

# ── Promotion constants ────────────────────────────────────────────────────────
PASS_THRESHOLD        = 0.80   # 80% to pass an exam
REQUIRED_TOTAL_EXAMS  = 10     # must pass 10 full (non-practice) exams
MAX_RETAKES           = 2      # 0=first try + 2 retakes = 3 total allowed
REQUIRED_BOOKS        = 60     # books read at this grade level
REQUIRED_AVG          = 80.0   # 80% overall average across best scores

# ── Exam progression: exam_number 1-5=easy, 6-8=medium, 9-10=hard ─────────────
EXAM_DIFFICULTY_MAP: Dict[int, str] = {
    1: "easy", 2: "easy", 3: "easy", 4: "easy", 5: "easy",
    6: "medium", 7: "medium", 8: "medium",
    9: "hard", 10: "hard",
}

# ── Practice constants ─────────────────────────────────────────────────────────
PRACTICE_QUESTIONS = 15
PRACTICE_TIME_SEC  = 600       # 10 minutes

# ── Time limits ────────────────────────────────────────────────────────────────
TIME_LIMIT_SEC     = 1800      # 30 minutes (full exam)

SECTION_LABELS = {
    "phonics":       "📖 Phonics & Word Recognition",
    "vocabulary":    "💬 Vocabulary & Context Clues",
    "comprehension": "🧠 Reading Comprehension",
    "grammar":       "✏️ Grammar & Language",
    "mixed":         "🎯 Mixed Assessment",
    "practice":      "🧪 Practice Test",
}
ALL_REAL_SECTIONS = ["phonics", "vocabulary", "comprehension", "grammar", "mixed"]

XP_FOR_ATTEMPT  = 10
XP_FOR_PASS     = 100
XP_FOR_PERFECT  = 50           # bonus for ≥ 90%
XP_PRACTICE     = 20           # flat XP for completing a practice test


# ─────────────────────────────────────────────────────────────────────────────
# ── Gemini prompt builder ─────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

def _grade_label(grade: int) -> str:
    return {
        0: "Kindergarten", 1: "Grade 1", 2: "Grade 2", 3: "Grade 3",
        4: "Grade 4", 5: "Grade 5", 6: "Grade 6",
    }.get(grade, f"Grade {grade}")


def _build_generation_prompt(
    grade: int,
    section: str,
    num_questions: int = 30,
    exam_difficulty: str = "medium",
    is_practice: bool = False,
) -> str:
    """Build a grade-calibrated Gemini prompt for exam questions."""
    grade_label = _grade_label(grade)

    # Base complexity by grade band
    if grade <= 1:
        base_complexity = (
            "Use VERY simple language (1–2 syllable words). "
            "For comprehension, include a short 2–3 sentence passage. "
            "Offer 3 choices (A, B, C) only. "
            "Topics: letter sounds, CVC words, rhyming, sight words, simple subjects/verbs."
        )
        num_choices = 3
    elif grade <= 3:
        base_complexity = (
            "Use grade-appropriate language for a 7–9 year old. "
            "For comprehension, include a paragraph (4–6 sentences). "
            "Offer 4 choices (A, B, C, D). "
            "Topics: vowel teams, prefixes/suffixes, context clues, synonyms, main idea, "
            "sequence, nouns/verbs/adjectives, basic punctuation."
        )
        num_choices = 4
    else:
        base_complexity = (
            "Use grade-appropriate language for a 10–12 year old. "
            "For comprehension, include a multi-paragraph passage (8–12 sentences). "
            "Offer 4 choices (A, B, C, D). "
            "Topics: inferences, author's purpose, figurative language, Greek/Latin roots, "
            "academic vocabulary, cause & effect, complex sentences, parts of speech."
        )
        num_choices = 4

    # Overlay exam_difficulty to shape question hardness within grade
    difficulty_overlay = {
        "easy": (
            f"This is an EASY exam (exams 1–5 of 10 at this grade). "
            f"All questions should be accessible for a student who is just beginning {grade_label}. "
            f"Stick to foundational skills, straight-recall, and clear direct questions. "
            f"{'0 multi-select questions.' if grade <= 1 else '0 multi-select questions for now.'}"
        ),
        "medium": (
            f"This is a MEDIUM difficulty exam (exams 6–8 of 10). "
            f"Students should now have solid foundational skills. Mix in inferential thinking, "
            f"multi-step reasoning, and some multi-select questions "
            f"({'0' if grade <= 1 else '2-3'} multi-select). "
            f"About 30% of questions should require deeper analysis."
        ),
        "hard": (
            f"This is a HARD exam (exams 9–10 of 10 — final challenge). "
            f"Push the student to synthesize, infer, and apply knowledge. "
            f"Include {'0' if grade <= 1 else '4-5'} multi-select questions. "
            f"60%+ of questions should be challenging. "
            f"This is the toughest version of {grade_label} content."
        ),
    }.get(exam_difficulty, "")

    if is_practice:
        difficulty_overlay = (
            f"This is a PRACTICE TEST — friendly, encouraging, and confidence-building. "
            f"All questions should be straightforward and mostly 'easy' difficulty. "
            f"The goal is to help students get comfortable with the exam format, not to challenge them. "
            f"0 multi-select questions."
        )

    strand_guide = {
        "phonics": "ALL questions must test phonics and word recognition: letter sounds, blending, "
                   "decoding, spelling patterns, syllabication, morphology.",
        "vocabulary": "ALL questions must test vocabulary: context clues, word meanings, synonyms, "
                      "antonyms, homonyms, figurative language, academic vocabulary.",
        "comprehension": "ALL questions must include a reading passage and test comprehension: main idea, "
                         "details, sequence, inference, character analysis, author's purpose, text structure.",
        "grammar": "ALL questions must test grammar: parts of speech, sentence structure, punctuation, "
                   "capitalization, verb tense, subject-verb agreement.",
        "mixed": "Distribute questions across ALL strands proportionally: phonics, vocabulary, "
                 "comprehension (with a short passage), grammar, and mixed-strand questions.",
        "practice": "Mix questions evenly across phonics, vocabulary, comprehension, and grammar. "
                    "Include a short comprehension passage. Keep all questions straightforward.",
    }.get(section, "Test reading skills appropriate for this grade level.")

    return f"""You are an expert {grade_label} ELA assessment writer creating a standardized reading exam.

GRADE LEVEL: {grade_label}
SECTION: {SECTION_LABELS.get(section, section)}
TOTAL QUESTIONS: {num_questions}
EXAM TYPE: {"Practice Test (warmup)" if is_practice else "Official Exam"}

GRADE COMPLEXITY:
{base_complexity}

DIFFICULTY LEVEL:
{difficulty_overlay}

STRAND GUIDE:
{strand_guide}

Generate exactly {num_questions} questions. Each question must be a valid, educationally sound assessment item.

Return ONLY valid JSON — no markdown, no extra text:
{{
  "questions": [
    {{
      "question_number": 1,
      "strand": "<one of: phonics|vocabulary|comprehension|grammar|mixed>",
      "question_type": "<single|multi>",
      "passage": "<reading passage text if comprehension question, else null>",
      "question_text": "<the question>",
      "choices": ["A. <choice>", "B. <choice>", "C. <choice>"{', "D. <choice>"' if num_choices == 4 else ''}],
      "correct_answers": ["A"],
      "explanation": "<1 sentence explanation of why that answer is correct>",
      "difficulty": "<easy|medium|hard>"
    }}
  ]
}}

CRITICAL RULES:
- question_type "multi" means multiple answers correct — correct_answers will have 2+ items like ["A","C"]
- question_type "single" means exactly one correct answer
- All choice letters in correct_answers MUST correspond to actual items in the choices array
- For {grade_label}: {"3 choices ONLY (A, B, C)" if grade <= 1 else "4 choices (A, B, C, D)"}
- passage field: ONLY fill for comprehension questions; set to null for all others
- Make every question unique
- Exam should realistically match the difficulty level described above
"""


async def _generate_questions_with_gemini(
    grade: int,
    section: str,
    num_questions: int = 30,
    exam_difficulty: str = "medium",
    is_practice: bool = False,
) -> List[dict]:
    """Call Gemini to generate exam questions. Returns parsed list."""
    from google import genai as _genai
    from google.genai import types as _gtypes

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise HTTPException(500, "Gemini API key not configured")

    prompt = _build_generation_prompt(grade, section, num_questions, exam_difficulty, is_practice)

    client = _genai.Client(api_key=api_key)
    response = await asyncio.to_thread(
        client.models.generate_content,
        model="gemini-2.5-flash",
        contents=prompt,
        config=_gtypes.GenerateContentConfig(
            response_modalities=["TEXT"],
            temperature=0.75,
        ),
    )

    raw = response.candidates[0].content.parts[0].text.strip()

    if "```" in raw:
        parts = raw.split("```")
        for part in parts:
            if part.startswith("json"):
                raw = part[4:].strip()
                break
            elif "{" in part:
                raw = part.strip()
                break

    data = json.loads(raw)
    questions = data.get("questions", [])

    validated = []
    for i, q in enumerate(questions[:num_questions]):
        validated.append({
            "question_number": i + 1,
            "strand": q.get("strand", section),
            "question_type": q.get("question_type", "single"),
            "passage": q.get("passage"),
            "question_text": q.get("question_text", ""),
            "choices": q.get("choices", []),
            "correct_answers": q.get("correct_answers", []),
            "explanation": q.get("explanation"),
            "difficulty": q.get("difficulty", "medium"),
        })

    return validated


# ─────────────────────────────────────────────────────────────────────────────
# ── Retake helpers ────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

async def _get_section_retake_number(
    db: AsyncSession,
    student_id: str,
    grade_level: int,
    section: str,
) -> int:
    """Return the next retake number for this section (0=first attempt, 1=1st retake, etc.)"""
    r = await db.execute(
        select(ReadingExamAttempt)
        .where(
            ReadingExamAttempt.student_id == student_id,
            ReadingExamAttempt.grade_level == grade_level,
            ReadingExamAttempt.section == section,
            ReadingExamAttempt.is_practice == False,  # noqa: E712
        )
        .order_by(desc(ReadingExamAttempt.completed_at))
    )
    past = r.scalars().all()
    return len(past)   # 0 if never attempted, 1 if 1 attempt already, etc.


async def _get_next_exam_number(
    db: AsyncSession,
    student_id: str,
    grade_level: int,
) -> int:
    """Return the next sequential exam number (1–10) for this student at this grade."""
    r = await db.execute(
        select(func.count(ReadingExamAttempt.id))
        .where(
            ReadingExamAttempt.student_id == student_id,
            ReadingExamAttempt.grade_level == grade_level,
            ReadingExamAttempt.is_practice == False,  # noqa: E712
            ReadingExamAttempt.passed == True,         # noqa: E712
        )
    )
    passed_count = r.scalar() or 0
    # Next exam number = passed_count + 1, capped at 10
    return min(int(passed_count) + 1, 10)


async def _count_books_read(db: AsyncSession, student_id: str, grade_level: int) -> int:
    """Count stories completed by this student at this grade level."""
    try:
        from app.models.reading_progress import ReadingProgress
        r = await db.execute(
            select(func.count(ReadingProgress.id))
            .where(
                ReadingProgress.student_id == student_id,
                ReadingProgress.completed_at.isnot(None),
            )
        )
        return int(r.scalar() or 0)
    except Exception:
        return 0   # table may not exist in all deployments


# ─────────────────────────────────────────────────────────────────────────────
# ── Endpoints ─────────────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ExamOut)
async def generate_exam(
    req: GenerateExamRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Generate a fresh exam (full 30Q or practice 15Q) using Gemini."""
    section = "practice" if req.is_practice else req.section
    if section not in SECTION_LABELS:
        raise HTTPException(400, f"Invalid section. Choose from: {list(SECTION_LABELS.keys())}")
    if not (0 <= req.grade_level <= 6):
        raise HTTPException(400, "grade_level must be 0 (Kindergarten) through 6")

    if req.is_practice:
        num_questions = PRACTICE_QUESTIONS
        time_limit    = PRACTICE_TIME_SEC
        exam_difficulty = "easy"
    else:
        # ── Retake guard: check if student has exhausted retakes for this section ──
        retake_num = await _get_section_retake_number(db, x_student_id, req.grade_level, section)
        if retake_num > MAX_RETAKES:
            raise HTTPException(
                400,
                f"You have used all {MAX_RETAKES} retakes for {SECTION_LABELS.get(section, section)}. "
                f"You must reset your progress to continue."
            )

        # ── Determine difficulty from exam_number ──
        exam_num = await _get_next_exam_number(db, x_student_id, req.grade_level)
        exam_difficulty = EXAM_DIFFICULTY_MAP.get(exam_num, "hard")
        num_questions = 30
        time_limit    = TIME_LIMIT_SEC

    # Generate questions via Gemini
    try:
        raw_questions = await _generate_questions_with_gemini(
            req.grade_level, section, num_questions, exam_difficulty, req.is_practice,
        )
    except Exception as e:
        raise HTTPException(500, f"Question generation failed: {str(e)}")

    # Persist exam + questions
    exam = ReadingExam(
        grade_level=req.grade_level,
        section=section,
        is_practice=req.is_practice,
        total_questions=len(raw_questions),
        time_limit_sec=time_limit,
        exam_difficulty=exam_difficulty,
    )
    db.add(exam)
    await db.flush()

    db_questions = []
    for q in raw_questions:
        qq = ReadingExamQuestion(
            exam_id=exam.id,
            question_number=q["question_number"],
            strand=q["strand"],
            question_type=q["question_type"],
            passage=q.get("passage"),
            question_text=q["question_text"],
            choices=q["choices"],
            correct_answers=q["correct_answers"],
            explanation=q.get("explanation"),
            difficulty=q.get("difficulty", "medium"),
        )
        db.add(qq)
        db_questions.append(qq)

    await db.commit()
    await db.refresh(exam)
    for q in db_questions:
        await db.refresh(q)

    return ExamOut(
        exam_id=exam.id,
        grade_level=exam.grade_level,
        section=exam.section,
        is_practice=exam.is_practice,
        total_questions=exam.total_questions,
        time_limit_sec=exam.time_limit_sec,
        exam_difficulty=exam.exam_difficulty,
        questions=[
            ExamQuestionOut(
                id=q.id,
                question_number=q.question_number,
                strand=q.strand,
                question_type=q.question_type,
                passage=q.passage,
                question_text=q.question_text,
                choices=q.choices,
                difficulty=q.difficulty,
            )
            for q in db_questions
        ],
    )


@router.post("/submit", response_model=ExamResultOut)
async def submit_exam(
    req: SubmitExamRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Submit completed exam answers. Returns full scored results + XP."""
    exam_r = await db.execute(select(ReadingExam).where(ReadingExam.id == req.exam_id))
    exam = exam_r.scalar_one_or_none()
    if not exam:
        raise HTTPException(404, "Exam not found")

    q_r = await db.execute(
        select(ReadingExamQuestion)
        .where(ReadingExamQuestion.exam_id == req.exam_id)
        .order_by(ReadingExamQuestion.question_number)
    )
    questions = q_r.scalars().all()

    # Score answers
    correct_count = 0
    results: List[QuestionResult] = []
    for q in questions:
        student_ans = req.answers.get(q.id, [])
        correct_ans = q.correct_answers or []

        if q.question_type == "multi":
            is_correct = sorted(student_ans) == sorted(correct_ans)
        else:
            is_correct = (
                len(student_ans) == 1 and
                len(correct_ans) >= 1 and
                student_ans[0].upper() == correct_ans[0].upper()
            )

        if is_correct:
            correct_count += 1

        results.append(QuestionResult(
            question_id=q.id,
            question_number=q.question_number,
            question_text=q.question_text,
            passage=q.passage,
            choices=q.choices,
            student_answers=student_ans,
            correct_answers=correct_ans,
            is_correct=is_correct,
            explanation=q.explanation,
            strand=q.strand,
        ))

    total     = len(questions) or 30
    score_pct = round((correct_count / total) * 100, 1)

    # Practice tests don't use the 80% threshold, just mark as pass
    if exam.is_practice:
        passed = score_pct >= 50.0
    else:
        passed = score_pct >= (PASS_THRESHOLD * 100)

    # Get exam_number and retake_number
    if exam.is_practice:
        exam_number   = 0
        retake_number = 0
    else:
        past_r = await db.execute(
            select(ReadingExamAttempt)
            .where(
                ReadingExamAttempt.student_id == x_student_id,
                ReadingExamAttempt.grade_level == exam.grade_level,
                ReadingExamAttempt.section == exam.section,
                ReadingExamAttempt.is_practice == False,  # noqa: E712
            )
        )
        past_attempts = past_r.scalars().all()
        retake_number = len(past_attempts)          # 0=first try, 1=1st retake, ...
        exam_number   = await _get_next_exam_number(db, x_student_id, exam.grade_level)

    retakes_remaining = max(0, MAX_RETAKES - retake_number)

    # Check if student burned all retakes and still failed → trigger reset
    reset_triggered = (
        not exam.is_practice
        and not passed
        and retake_number >= MAX_RETAKES
    )

    # XP calculation
    if exam.is_practice:
        xp = XP_PRACTICE
    else:
        xp = XP_FOR_ATTEMPT
        if passed:
            xp += XP_FOR_PASS
        if score_pct >= 90:
            xp += XP_FOR_PERFECT

    # Parse started_at safely:
    # 1. JS sends ISO strings with "Z" suffix — Python 3.9 fromisoformat() needs "+00:00" instead.
    # 2. The DB column is TIMESTAMP WITHOUT TIME ZONE, so strip tzinfo to avoid
    #    "can't subtract offset-naive and offset-aware datetimes" on INSERT.
    def _parse_iso(s):
        if not s:
            return None
        try:
            dt = datetime.fromisoformat(str(s).replace('Z', '+00:00'))
            return dt.replace(tzinfo=None)   # strip tz — column is TIMESTAMP WITHOUT TIME ZONE
        except Exception:
            return None

    # Guard student_id FK — the header might be the Supabase auth UID (parent)
    # which is NOT a students row; make it nullable to avoid FK violation.
    stu_check = await db.execute(select(Student).where(Student.id == x_student_id))
    safe_student_id = x_student_id if stu_check.scalar_one_or_none() else None

    attempt = ReadingExamAttempt(
        exam_id=req.exam_id,
        student_id=safe_student_id,
        grade_level=exam.grade_level,
        section=exam.section,
        is_practice=exam.is_practice,
        exam_number=exam_number,
        retake_number=retake_number,
        answers=req.answers,
        correct_count=correct_count,
        total_questions=total,
        score_pct=score_pct,
        passed=passed,
        time_taken_sec=req.time_taken_sec,
        xp_earned=xp,
        started_at=_parse_iso(req.started_at),
        completed_at=datetime.utcnow(),
        reset_triggered=reset_triggered,
    )
    db.add(attempt)
    try:
        await db.flush()
    except Exception as e:
        await db.rollback()
        raise HTTPException(500, f"Failed to save exam attempt: {str(e)}")

    try:
        await award_xp(db, x_student_id, xp, f"exam_{exam.section}_{'pass' if passed else 'attempt'}")
    except Exception:
        pass  # XP failure must never block score saving

    await db.commit()
    await db.refresh(attempt)

    # If reset triggered — wipe all non-practice attempts for this grade
    if reset_triggered:
        await _reset_grade_progress(db, x_student_id, exam.grade_level)

    # Auto-promote grade if readiness criteria met
    if not exam.is_practice:
        await _check_and_promote(db, x_student_id, exam.grade_level)

    return ExamResultOut(
        attempt_id=attempt.id,
        exam_id=exam.id,
        grade_level=exam.grade_level,
        section=exam.section,
        is_practice=exam.is_practice,
        exam_number=exam_number,
        retake_number=retake_number,
        retakes_remaining=retakes_remaining,
        correct_count=correct_count,
        total_questions=total,
        score_pct=score_pct,
        passed=passed,
        xp_earned=xp,
        time_taken_sec=req.time_taken_sec,
        reset_triggered=reset_triggered,
        results=results,
    )


@router.get("/history", response_model=List[ExamHistoryItem])
async def get_exam_history(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return all past exam attempts for the student, newest first."""
    r = await db.execute(
        select(ReadingExamAttempt)
        .where(ReadingExamAttempt.student_id == x_student_id)
        .order_by(desc(ReadingExamAttempt.completed_at))
    )
    attempts = r.scalars().all()

    return [
        ExamHistoryItem(
            attempt_id=a.id,
            exam_id=a.exam_id,
            grade_level=a.grade_level,
            section=a.section,
            section_label=SECTION_LABELS.get(a.section, a.section),
            is_practice=a.is_practice,
            exam_number=a.exam_number,
            retake_number=a.retake_number,
            score_pct=a.score_pct,
            correct_count=a.correct_count,
            total_questions=a.total_questions,
            passed=a.passed,
            xp_earned=a.xp_earned,
            time_taken_sec=a.time_taken_sec,
            completed_at=str(a.completed_at),
        )
        for a in attempts
    ]


@router.get("/scores", response_model=List[ExamHistoryItem])
async def get_all_scores(
    x_student_id: str = Header(...),
    include_practice: bool = True,
    db: AsyncSession = Depends(get_session),
):
    """
    Return ALL scored exam attempts (including practice tests) for the student.
    Always logs every test score — use this for the full score history page.
    Set ?include_practice=false to exclude practice tests.
    """
    q = (
        select(ReadingExamAttempt)
        .where(ReadingExamAttempt.student_id == x_student_id)
        .order_by(desc(ReadingExamAttempt.completed_at))
    )
    if not include_practice:
        q = q.where(ReadingExamAttempt.is_practice == False)  # noqa: E712

    r = await db.execute(q)
    attempts = r.scalars().all()

    return [
        ExamHistoryItem(
            attempt_id=a.id,
            exam_id=a.exam_id,
            grade_level=a.grade_level,
            section=a.section,
            section_label=SECTION_LABELS.get(a.section, a.section),
            is_practice=a.is_practice,
            exam_number=a.exam_number,
            retake_number=a.retake_number,
            score_pct=a.score_pct,
            correct_count=a.correct_count,
            total_questions=a.total_questions,
            passed=a.passed,
            xp_earned=a.xp_earned,
            time_taken_sec=a.time_taken_sec,
            completed_at=str(a.completed_at),
        )
        for a in attempts
    ]


@router.get("/readiness", response_model=GradeReadinessOut)
async def get_grade_readiness(
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return grade readiness status: sections, retakes, books, avg score."""
    stu_r = await db.execute(select(Student).where(Student.id == x_student_id))
    student = stu_r.scalar_one_or_none()
    current_grade = student.grade_level if student else 1

    # All non-practice attempts at current grade
    att_r = await db.execute(
        select(ReadingExamAttempt)
        .where(
            ReadingExamAttempt.student_id == x_student_id,
            ReadingExamAttempt.grade_level == current_grade,
            ReadingExamAttempt.is_practice == False,  # noqa: E712
        )
    )
    all_attempts = att_r.scalars().all()

    # Per-section status
    section_map: Dict[str, List[ReadingExamAttempt]] = {}
    for a in all_attempts:
        section_map.setdefault(a.section, []).append(a)

    sections_status: List[SectionStatus] = []
    any_maxed = False
    for sec in ALL_REAL_SECTIONS:
        sec_attempts = section_map.get(sec, [])
        passed_attempts = [a for a in sec_attempts if a.passed]
        best_score  = max((a.score_pct for a in sec_attempts), default=0.0)
        passed      = len(passed_attempts) > 0
        total_att   = len(sec_attempts)
        retake_num  = max(total_att - 1, 0)   # 0=first try
        retakes_rem = max(0, MAX_RETAKES - retake_num)
        maxed_and_failed = (retake_num >= MAX_RETAKES and not passed)
        if maxed_and_failed:
            any_maxed = True
        sections_status.append(SectionStatus(
            section=sec,
            section_label=SECTION_LABELS.get(sec, sec),
            passed=passed,
            best_score=best_score,
            total_attempts=total_att,
            retake_number=retake_num,
            retakes_remaining=retakes_rem,
        ))

    # Total UNIQUE passes (each section counted once)
    total_passed = sum(1 for ss in sections_status if ss.passed)

    # Overall average (best score per passed section)
    scored_sections = [ss.best_score for ss in sections_status if ss.passed]
    overall_avg = round(sum(scored_sections) / len(scored_sections), 1) if scored_sections else 0.0

    # Books read
    books_read = await _count_books_read(db, x_student_id, current_grade)

    # Readiness: 10 passed exams + 60 books + 80% avg + no maxed-out failed sections
    ready = (
        total_passed >= REQUIRED_TOTAL_EXAMS
        and books_read >= REQUIRED_BOOKS
        and overall_avg >= REQUIRED_AVG
        and not any_maxed
        and current_grade < 6
    )

    return GradeReadinessOut(
        student_grade=current_grade,
        total_passed_exams=total_passed,
        required_exams=REQUIRED_TOTAL_EXAMS,
        required_books=REQUIRED_BOOKS,
        books_read=books_read,
        overall_avg_score=overall_avg,
        required_avg=REQUIRED_AVG,
        sections=sections_status,
        any_section_maxed_retakes=any_maxed,
        ready_for_next_grade=ready,
        promoted_grade=None,
    )


@router.get("/{attempt_id}/review", response_model=ExamResultOut)
async def review_exam_attempt(
    attempt_id: str,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Return a previously completed attempt with full question + answer breakdown."""
    att_r = await db.execute(
        select(ReadingExamAttempt)
        .where(
            ReadingExamAttempt.id == attempt_id,
            ReadingExamAttempt.student_id == x_student_id,
        )
    )
    attempt = att_r.scalar_one_or_none()
    if not attempt:
        raise HTTPException(404, "Attempt not found")

    q_r = await db.execute(
        select(ReadingExamQuestion)
        .where(ReadingExamQuestion.exam_id == attempt.exam_id)
        .order_by(ReadingExamQuestion.question_number)
    )
    questions = q_r.scalars().all()

    results = []
    for q in questions:
        student_ans = attempt.answers.get(q.id, [])
        correct_ans = q.correct_answers or []
        if q.question_type == "multi":
            is_correct = sorted(student_ans) == sorted(correct_ans)
        else:
            is_correct = (
                len(student_ans) == 1 and len(correct_ans) >= 1
                and student_ans[0].upper() == correct_ans[0].upper()
            )
        results.append(QuestionResult(
            question_id=q.id,
            question_number=q.question_number,
            question_text=q.question_text,
            passage=q.passage,
            choices=q.choices,
            student_answers=student_ans,
            correct_answers=correct_ans,
            is_correct=is_correct,
            explanation=q.explanation,
            strand=q.strand,
        ))

    return ExamResultOut(
        attempt_id=attempt.id,
        exam_id=attempt.exam_id,
        grade_level=attempt.grade_level,
        section=attempt.section,
        is_practice=attempt.is_practice,
        exam_number=attempt.exam_number,
        retake_number=attempt.retake_number,
        retakes_remaining=max(0, MAX_RETAKES - attempt.retake_number),
        correct_count=attempt.correct_count,
        total_questions=attempt.total_questions,
        score_pct=attempt.score_pct,
        passed=attempt.passed,
        xp_earned=attempt.xp_earned,
        time_taken_sec=attempt.time_taken_sec,
        reset_triggered=attempt.reset_triggered,
        results=results,
    )


@router.post("/reset-progress")
async def reset_grade_progress(
    req: ResetProgressRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session),
):
    """Manually reset all exam progress for a student at a grade. Starts all over."""
    await _reset_grade_progress(db, x_student_id, req.grade_level)
    return {"message": f"Progress reset for grade {req.grade_level}"}


# ─────────────────────────────────────────────────────────────────────────────
# ── Private helpers ───────────────────────────────────────────────────────────
# ─────────────────────────────────────────────────────────────────────────────

async def _reset_grade_progress(db: AsyncSession, student_id: str, grade_level: int):
    """Delete all non-practice attempts for this student at this grade."""
    try:
        att_r = await db.execute(
            select(ReadingExamAttempt)
            .where(
                ReadingExamAttempt.student_id == student_id,
                ReadingExamAttempt.grade_level == grade_level,
                ReadingExamAttempt.is_practice == False,  # noqa: E712
            )
        )
        attempts = att_r.scalars().all()
        for a in attempts:
            await db.delete(a)
        await db.commit()
        print(f"[exams] Reset grade {grade_level} progress for student {student_id} ({len(attempts)} attempts deleted)")
    except Exception as e:
        print(f"[exams] Reset failed (non-fatal): {e}")


async def _check_and_promote(db: AsyncSession, student_id: str, grade_level: int):
    """Auto-promote student grade if ALL readiness criteria are met."""
    try:
        stu_r = await db.execute(select(Student).where(Student.id == student_id))
        student = stu_r.scalar_one_or_none()
        if not student or student.grade_level != grade_level or grade_level >= 6:
            return

        att_r = await db.execute(
            select(ReadingExamAttempt)
            .where(
                ReadingExamAttempt.student_id == student_id,
                ReadingExamAttempt.grade_level == grade_level,
                ReadingExamAttempt.is_practice == False,  # noqa: E712
            )
        )
        all_attempts = att_r.scalars().all()

        section_map: Dict[str, List] = {}
        for a in all_attempts:
            section_map.setdefault(a.section, []).append(a)

        total_passed = sum(
            1 for sec in ALL_REAL_SECTIONS
            if any(a.passed for a in section_map.get(sec, []))
        )
        any_maxed = any(
            len(section_map.get(sec, [])) > MAX_RETAKES
            and not any(a.passed for a in section_map.get(sec, []))
            for sec in ALL_REAL_SECTIONS
        )

        scored = [
            max(a.score_pct for a in section_map.get(sec, [{"score_pct": 0}])
                if hasattr(a, "score_pct"))
            for sec in ALL_REAL_SECTIONS
            if any(a.passed for a in section_map.get(sec, []))
        ]
        avg = sum(scored) / len(scored) if scored else 0.0
        books_read = await _count_books_read(db, student_id, grade_level)

        if (
            total_passed >= REQUIRED_TOTAL_EXAMS
            and books_read >= REQUIRED_BOOKS
            and avg >= REQUIRED_AVG
            and not any_maxed
        ):
            student.grade_level = grade_level + 1
            await db.commit()
            print(f"[exams] Promoted student {student_id}: grade {grade_level} → {grade_level + 1}")

    except Exception as e:
        print(f"[exams] Promotion check failed (non-fatal): {e}")
