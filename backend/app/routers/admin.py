"""Admin router — all users, all books, all test scores."""
from fastapi import APIRouter
from sqlalchemy import select, func, desc
from app.database import get_session
from app.models.student import Student
from app.models.story import Story
from app.models.exam import ReadingExamAttempt
from app.models.gamification import XPLedger
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

LEVEL_NAMES = {1: "Bookworm 🐛", 2: "Story Explorer 🗺️", 3: "Word Wizard 🔮", 4: "Reading Champion 🏆", 5: "Legend 🌟"}
XP_PER_LEVEL = 200

def compute_level(total_xp: int):
    level = min(max(total_xp // XP_PER_LEVEL + 1, 1), 5)
    return level, LEVEL_NAMES.get(level, "Legend 🌟")

GRADE_LABELS = {0: "K", 1: "1st", 2: "2nd", 3: "3rd", 4: "4th", 5: "5th", 6: "6th", 7: "7th", 8: "8th"}
SECTION_LABELS = {
    "phonics": "Phonics & Word Recognition",
    "vocabulary": "Vocabulary & Context Clues",
    "comprehension": "Reading Comprehension",
    "grammar": "Grammar & Language",
    "mixed": "Mixed Assessment",
    "practice": "Practice Test",
}


@router.get("/users")
async def get_all_users(db: AsyncSession = Depends(get_session)):
    """Return all students with total XP, level, and story count."""
    result = await db.execute(
        select(
            Student.id,
            Student.name,
            Student.grade_level,
            Student.school,
            Student.avatar_url,
            Student.created_at,
            func.coalesce(func.sum(XPLedger.amount), 0).label("total_xp"),
        )
        .outerjoin(XPLedger, XPLedger.student_id == Student.id)
        .group_by(Student.id, Student.name, Student.grade_level, Student.school, Student.avatar_url, Student.created_at)
        .order_by(desc("total_xp"))
    )
    rows = result.fetchall()

    users = []
    for row in rows:
        student_id, name, grade_level, school, avatar_url, created_at, total_xp = row

        # Count stories for this student
        story_count_r = await db.execute(
            select(func.count()).where(Story.student_id == student_id)
        )
        story_count = story_count_r.scalar() or 0

        # Count exam attempts
        exam_count_r = await db.execute(
            select(func.count()).where(
                ReadingExamAttempt.student_id == student_id,
                ReadingExamAttempt.is_practice == False,  # noqa: E712
            )
        )
        exam_count = exam_count_r.scalar() or 0

        level, level_name = compute_level(int(total_xp))
        users.append({
            "id": student_id,
            "name": name,
            "grade_level": grade_level,
            "grade_label": GRADE_LABELS.get(grade_level, str(grade_level)),
            "school": school,
            "avatar_url": avatar_url,
            "created_at": str(created_at),
            "total_xp": int(total_xp),
            "level": level,
            "level_name": level_name,
            "story_count": story_count,
            "exam_count": exam_count,
        })
    return users


@router.get("/books")
async def get_all_books(db: AsyncSession = Depends(get_session)):
    """Return all stories created by all users."""
    from app.models.story import StoryPage
    result = await db.execute(
        select(Story, Student.name.label("student_name"))
        .outerjoin(Student, Student.id == Story.student_id)
        .order_by(desc(Story.created_at))
    )
    rows = result.fetchall()

    books = []
    for story, student_name in rows:
        # Count pages
        page_count_r = await db.execute(
            select(func.count()).where(StoryPage.story_id == story.id)
        )
        page_count = page_count_r.scalar() or 0

        books.append({
            "id": story.id,
            "title": story.title,
            "theme": story.theme,
            "grade_level": story.grade_level,
            "grade_label": GRADE_LABELS.get(story.grade_level, str(story.grade_level)),
            "cover_media_url": story.cover_media_url,
            "student_id": story.student_id,
            "student_name": student_name or "Unknown",
            "created_at": str(story.created_at),
            "page_count": page_count,
        })
    return books


@router.get("/scores")
async def get_all_scores(db: AsyncSession = Depends(get_session)):
    """Return all exam attempts by all students, newest first."""
    result = await db.execute(
        select(ReadingExamAttempt, Student.name.label("student_name"))
        .outerjoin(Student, Student.id == ReadingExamAttempt.student_id)
        .order_by(desc(ReadingExamAttempt.completed_at))
        .limit(500)
    )
    rows = result.fetchall()

    scores = []
    for attempt, student_name in rows:
        scores.append({
            "id": attempt.id,
            "student_id": attempt.student_id,
            "student_name": student_name or "Unknown",
            "grade_level": attempt.grade_level,
            "grade_label": GRADE_LABELS.get(attempt.grade_level, str(attempt.grade_level)),
            "section": attempt.section,
            "section_label": SECTION_LABELS.get(attempt.section, attempt.section),
            "is_practice": attempt.is_practice,
            "score_pct": attempt.score_pct,
            "correct_count": attempt.correct_count,
            "total_questions": attempt.total_questions,
            "passed": attempt.passed,
            "xp_earned": attempt.xp_earned,
            "time_taken_sec": attempt.time_taken_sec,
            "completed_at": str(attempt.completed_at),
        })
    return scores


@router.get("/stats")
async def get_admin_stats(db: AsyncSession = Depends(get_session)):
    """Summary stats for the admin dashboard."""
    total_users = (await db.execute(select(func.count()).select_from(Student))).scalar() or 0
    total_books = (await db.execute(select(func.count()).select_from(Story))).scalar() or 0
    total_exams = (await db.execute(select(func.count()).select_from(ReadingExamAttempt))).scalar() or 0
    total_xp = (await db.execute(select(func.coalesce(func.sum(XPLedger.amount), 0)))).scalar() or 0
    return {
        "total_users": int(total_users),
        "total_books": int(total_books),
        "total_exams": int(total_exams),
        "total_xp": int(total_xp),
    }


@router.delete("/books/{book_id}")
async def delete_book(book_id: str, db: AsyncSession = Depends(get_session)):
    """Admin: permanently delete a book and all its pages/vote logs."""
    from fastapi import HTTPException
    from app.models.story import StoryPage
    from sqlalchemy import text

    story = (await db.execute(select(Story).where(Story.id == book_id))).scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Book not found")

    # Delete pages and vote logs first (FK cascade handles it but be explicit)
    await db.execute(text("DELETE FROM story_vote_logs WHERE story_id = :sid").bindparams(sid=book_id))
    await db.execute(text("DELETE FROM story_pages WHERE story_id = :sid").bindparams(sid=book_id))
    await db.delete(story)
    await db.commit()
    return {"deleted": book_id}
