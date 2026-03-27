"""Stories router — generate, list, get"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.story import Story, StoryPage
from app.models.quiz import QuizQuestion
from app.services.ai_service import generate_story_with_ai
from app.services.gamification_service import award_xp

router = APIRouter()


class GenerateRequest(BaseModel):
    grade: int
    theme: str
    character_name: str
    language: str = "english"
    art_style: str = "cartoon"


class AnalyzeCharacterRequest(BaseModel):
    character: str


class PageResponse(BaseModel):
    id: str
    story_id: str
    page_number: int
    content: str
    media_url: Optional[str] = None
    word_count: int


class QuizResponse(BaseModel):
    id: str
    story_page_id: str
    question: str
    choices: list[str]
    correct_answer: str
    explanation: Optional[str] = None


class StoryResponse(BaseModel):
    id: str
    student_id: str
    title: str
    grade_level: int
    theme: str
    cover_media_url: Optional[str] = None
    pages: list[PageResponse] = []
    quiz_questions: list[QuizResponse] = []
    created_at: str


@router.post("/analyze-character")
async def analyze_character(req: AnalyzeCharacterRequest):
    """Use Gemini SDK directly to identify character + generate portrait — no OpenRouter."""
    import json
    from app.agents.content_agent import _call_gemini_text

    # ── Task 1: Gemini text — character analysis ──────────────────────────────
    async def analyze():
        prompt = f"""You are a creative children's story assistant.

The child said their favorite character is: "{req.character}"

Analyze this character and respond ONLY with valid JSON in this exact format:
{{
  "character_name": "{req.character}",
  "universe": "which franchise/universe (e.g. Marvel, Disney, Pixar, etc.)",
  "description": "1-sentence kid-friendly description of {req.character}",
  "image_prompt": "A vibrant full-body portrait illustration of {req.character}, [brief visual description matching the character's look], white background, clean edges, Disney/Pixar style, bright colors, high detail, no text"
}}

CRITICAL: character_name must be EXACTLY "{req.character}" — do NOT expand, add a surname, or rename it."""
        raw = await _call_gemini_text(
            system="You are a creative children's assistant. Reply with valid JSON only.",
            user=prompt,
            temperature=0.7,
        )
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw.strip())

    # ── Task 2: Generate character portrait — direct Gemini SDK ───────────────
    async def generate_portrait(image_prompt: str) -> Optional[str]:
        from app.agents.content_agent import _generate_image_nano_banana2
        return await _generate_image_nano_banana2(image_prompt)


    # Run both in parallel: LLM analysis + image generation
    try:
        char_data = await analyze()
    except Exception as e:
        print(f"[analyze-character] LLM failed: {e}")
        char_data = {
            "character_name": req.character,
            "universe": "Original",
            "description": f"The amazing {req.character} — ready for a great adventure!",
            "image_prompt": (
                f"A vibrant full-body portrait illustration of {req.character}, "
                "white background, Disney/Pixar cartoon style, bright colors, high detail, no text"
            ),
        }

    image_prompt = char_data.get(
        "image_prompt",
        f"A vibrant full-body portrait illustration of {char_data['character_name']}, "
        "white background, Disney/Pixar cartoon style, bright colors, high detail, no text"
    )

    portrait_url = await generate_portrait(image_prompt)
    print(f"[analyze-character] portrait saved: {portrait_url}")

    return {
        "character_name": req.character,  # always use the exact name the child typed
        "universe": char_data.get("universe", "Original"),
        "description": char_data.get("description", f"The amazing {req.character}!"),
        "character_image_url": portrait_url,
        "scenes": [],
    }


@router.post("/generate")
async def generate_story(
    req: GenerateRequest,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session)
):
    """Generate an AI story → save to DB → return full story."""
    if not x_student_id:
        x_student_id = "guest"

    # ── Ensure student row exists (FK guard) ─────────────────────────────────
    # The students table has a FK to parents, and stories FK to students.
    # On a fresh DB, we auto-create a minimal parent + student row so the
    # story INSERT doesn't fail with a FK violation.
    try:
        from app.models.student import Student as StudentModel
        from app.models.parent import Parent as ParentModel
        stu_check = await db.execute(
            select(StudentModel).where(StudentModel.id == x_student_id)
        )
        if not stu_check.scalar_one_or_none():
            # Create a corresponding parent row first (students FK → parents)
            par_check = await db.execute(
                select(ParentModel).where(ParentModel.id == x_student_id)
            )
            if not par_check.scalar_one_or_none():
                db.add(ParentModel(id=x_student_id, first_name="User", last_name=""))
                await db.flush()
            # Create the student row
            db.add(StudentModel(
                id=x_student_id,
                parent_id=x_student_id,
                name="Student",
                grade_level=req.grade,
            ))
            await db.flush()
    except Exception as fk_err:
        print(f"[generate_story] FK guard failed (non-fatal): {fk_err}")
        try:
            await db.rollback()
        except Exception:
            pass
    # ─────────────────────────────────────────────────────────────────────────

    try:
        story_data = await generate_story_with_ai(
            grade=req.grade,
            theme=req.theme,
            character_name=req.character_name,
            language=req.language,
            art_style=req.art_style,
        )
    except Exception as e:
        raise HTTPException(500, detail=f"Story generation failed: {str(e)}")

    import uuid as _uuid

    # Persist story to DB — wrapped so a DB failure never kills the response
    story_id = None
    db_pages: list = []
    db_quiz: list = []
    db_cover: str | None = story_data.get("cover_image_url")

    try:
        story = Story(
            student_id=x_student_id,
            title=story_data["title"],
            grade_level=req.grade,
            theme=req.theme,
            cover_media_url=story_data.get("cover_image_url"),
        )
        db.add(story)
        await db.flush()

        db_pages = []
        for p in story_data["pages"]:
            page = StoryPage(
                story_id=story.id,
                page_number=p["page_number"],
                content=p["content"],
                media_url=p.get("image_url"),
                word_count=len(p["content"].split()),
            )
            db.add(page)
            db_pages.append(page)

        await db.flush()

        db_quiz = []
        for q in story_data.get("quiz_questions", []):
            raw_pid = q["story_page_id"]
            resolved_pid = raw_pid
            if isinstance(raw_pid, str) and raw_pid.startswith("__page_") and raw_pid.endswith("__"):
                try:
                    idx = int(raw_pid[7:-2])
                    if 0 <= idx < len(db_pages):
                        resolved_pid = db_pages[idx].id
                except (ValueError, IndexError):
                    pass

            qq = QuizQuestion(
                story_page_id=resolved_pid,
                question=q["question"],
                choices=q["choices"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation"),
            )
            db.add(qq)
            db_quiz.append(qq)

        if not story.cover_media_url and db_pages:
            first_page_img = db_pages[0].media_url
            if first_page_img:
                story.cover_media_url = first_page_img
                db_cover = first_page_img

        await db.commit()
        await db.refresh(story)
        story_id = story.id

    except Exception as db_err:
        # DB unavailable (e.g. SQLite not configured in production) — still return the story
        print(f"[generate_story] DB persist failed (non-fatal): {db_err}")
        try:
            await db.rollback()
        except Exception:
            pass
        # Generate stable IDs from story content so the reader can still work
        story_id = str(_uuid.uuid4())
        db_cover = db_cover or (story_data["pages"][0].get("image_url") if story_data.get("pages") else None)

        # Build page/quiz objects as plain dicts when DB is unavailable
        db_pages = []
        for p in story_data.get("pages", []):
            db_pages.append(type("P", (), {
                "id": str(_uuid.uuid4()),
                "story_id": story_id,
                "page_number": p["page_number"],
                "content": p["content"],
                "media_url": p.get("image_url"),
                "word_count": len(p["content"].split()),
            })())

        db_quiz = []
        for q in story_data.get("quiz_questions", []):
            db_quiz.append(type("Q", (), {
                "id": str(_uuid.uuid4()),
                "story_page_id": db_pages[0].id if db_pages else None,
                "question": q["question"],
                "choices": q["choices"],
                "correct_answer": q["correct_answer"],
                "explanation": q.get("explanation"),
            })())

    return {
        "id": story_id,
        "student_id": x_student_id,
        "title": story_data["title"],
        "grade_level": req.grade,
        "theme": req.theme,
        "cover_media_url": db_cover,
        "pages": [{"id": p.id, "story_id": p.story_id, "page_number": p.page_number, "content": p.content, "media_url": p.media_url, "word_count": p.word_count} for p in db_pages],
        "quiz_questions": [{"id": q.id, "story_page_id": q.story_page_id, "question": q.question, "choices": q.choices, "correct_answer": q.correct_answer, "explanation": q.explanation} for q in db_quiz],
        "created_at": str(__import__("datetime").datetime.utcnow()),
    }


@router.get("")
async def list_stories(x_student_id: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_session)):
    if not x_student_id:
        x_student_id = "guest"

    from app.models.student import Student as StudentModel

    # Build the set of student_ids to query
    ids_to_query = {x_student_id}

    # Check if x_student_id is a STUDENT record UUID
    student_row = await db.execute(select(StudentModel).where(StudentModel.id == x_student_id))
    student_obj = student_row.scalar_one_or_none()

    if student_obj:
        # ── Case 1: Specific child selected ───────────────────────────────────
        # Only return stories explicitly created for THIS child.
        # Do NOT include parent_id stories — that leaks other stories into every child's view.
        pass  # ids_to_query already contains only x_student_id (the child)
    else:
        # ── Case 2: Show All — x_student_id is a parent's Supabase auth UUID ──
        # Aggregate stories for ALL children of this parent.
        kids_result = await db.execute(
            select(StudentModel.id).where(StudentModel.parent_id == x_student_id)
        )
        kid_ids = [row[0] for row in kids_result.all()]
        ids_to_query.update(kid_ids)

    result = await db.execute(
        select(Story).where(Story.student_id.in_(list(ids_to_query)))
    )
    stories = list(result.scalars().all())

    # Fetch reading_progress for all stories in one query (raw SQL via Supabase client)
    # Falls back to empty dict if table doesn't exist yet
    progress_map: dict = {}
    try:
        from app.database import supabase_client
        if supabase_client:
            story_ids = [s.id for s in stories]
            prog_resp = supabase_client.table("reading_progress") \
                .select("story_id,last_page,completed_at") \
                .eq("student_id", x_student_id) \
                .in_("story_id", story_ids) \
                .execute()
            for row in (prog_resp.data or []):
                progress_map[row["story_id"]] = row
    except Exception as e:
        print(f"[list_stories] progress fetch failed (table may not exist yet): {e}")

    # For stories missing a cover, try to get first page image
    out = []
    for s in stories:
        cover = s.cover_media_url
        if not cover:
            pages_r = await db.execute(
                select(StoryPage.media_url).where(StoryPage.story_id == s.id).order_by(StoryPage.page_number).limit(1)
            )
            first_img = pages_r.scalar_one_or_none()
            if first_img:
                cover = first_img
                s.cover_media_url = first_img

        # Get page count for progress calculation
        page_count_r = await db.execute(
            select(StoryPage.page_number).where(StoryPage.story_id == s.id).order_by(StoryPage.page_number.desc()).limit(1)
        )
        page_count = (page_count_r.scalar_one_or_none() or 0)

        prog = progress_map.get(s.id, {})
        last_page = prog.get("last_page", 0)
        completed_at = prog.get("completed_at")
        progress_pct = round((last_page / page_count) * 100) if page_count > 0 else 0

        out.append({
            "id": s.id, "title": s.title, "theme": s.theme,
            "grade_level": s.grade_level, "cover_media_url": cover,
            "student_id": s.student_id, "created_at": str(s.created_at),
            "last_page": last_page,
            "page_count": page_count,
            "progress_pct": progress_pct,
            "completed_at": completed_at,
        })
    await db.commit()
    return out


@router.delete("/{story_id}")
async def delete_story(story_id: str, x_student_id: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_session)):
    """Delete a story and all its pages + quiz questions."""
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")

    # Delete quiz questions linked to story pages
    pages_r = await db.execute(select(StoryPage).where(StoryPage.story_id == story_id))
    page_ids = [p.id for p in pages_r.scalars().all()]
    if page_ids:
        from sqlalchemy import delete as sa_delete
        await db.execute(sa_delete(QuizQuestion).where(QuizQuestion.story_page_id.in_(page_ids)))
        await db.execute(sa_delete(StoryPage).where(StoryPage.story_id == story_id))

    await db.delete(story)
    await db.commit()
    return {"deleted": True}


@router.post("/{story_id}/repair-images")
async def repair_story_images(story_id: str, db: AsyncSession = Depends(get_session)):
    """Regenerate images for any pages that are missing them, and fix cover."""
    from app.agents.content_agent import _generate_image_nano_banana2
    import asyncio

    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")

    pages_r = await db.execute(select(StoryPage).where(StoryPage.story_id == story_id).order_by(StoryPage.page_number))
    pages = pages_r.scalars().all()

    repaired = 0
    for page in pages:
        if page.media_url:
            continue  # already has image
        prompt = (
            f"{page.content[:200]}. "
            f"Theme: {story.theme}. "
            f"Pixar-style children's storybook illustration."
        )
        url = await _generate_image_nano_banana2(prompt)
        if url:
            page.media_url = url
            repaired += 1
        await asyncio.sleep(2)  # rate limit

    # Fix cover if missing
    if not story.cover_media_url and pages:
        story.cover_media_url = pages[0].media_url

    await db.commit()
    return {"repaired_pages": repaired, "cover_fixed": bool(story.cover_media_url)}


@router.get("/{story_id}")
async def get_story(story_id: str, db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Story).where(Story.id == story_id))
    story = result.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")

    pages_result = await db.execute(select(StoryPage).where(StoryPage.story_id == story_id))
    pages = pages_result.scalars().all()

    page_ids = [p.id for p in pages]
    quiz_result = await db.execute(select(QuizQuestion).where(QuizQuestion.story_page_id.in_(page_ids)))
    quiz_questions = quiz_result.scalars().all()

    return {
        "id": story.id,
        "student_id": story.student_id,
        "title": story.title,
        "grade_level": story.grade_level,
        "theme": story.theme,
        "cover_media_url": story.cover_media_url,
        "pages": [{"id": p.id, "story_id": p.story_id, "page_number": p.page_number, "content": p.content, "media_url": p.media_url, "word_count": p.word_count} for p in sorted(pages, key=lambda x: x.page_number)],
        "quiz_questions": [{"id": q.id, "story_page_id": q.story_page_id, "question": q.question, "choices": q.choices, "correct_answer": q.correct_answer, "explanation": q.explanation} for q in quiz_questions],
        "created_at": str(story.created_at),
    }


@router.post("/{story_id}/pages/{page_number}/read")
async def mark_page_read(
    story_id: str,
    page_number: int,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session)
):
    if not x_student_id:
        x_student_id = "guest"
    await award_xp(db, x_student_id, 5, "page_read")
    return {"xp_awarded": 5}


@router.post("/{story_id}/complete")
async def mark_story_complete(
    story_id: str,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session)
):
    if not x_student_id:
        x_student_id = "guest"
    await award_xp(db, x_student_id, 50, "book_complete")

    # Also record completion in reading_progress
    try:
        from app.database import supabase_client
        if supabase_client:
            from datetime import datetime, timezone
            supabase_client.table("reading_progress").upsert({
                "student_id": x_student_id,
                "story_id": story_id,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }, on_conflict="student_id,story_id").execute()
    except Exception as e:
        print(f"[mark_story_complete] progress update failed: {e}")

    return {"xp_awarded": 50}


@router.post("/{story_id}/progress")
async def save_reading_progress(
    story_id: str,
    x_student_id: Optional[str] = Header(default=None),
    last_page: int = 0,
):
    """Upsert last-read page for resume-reading functionality."""
    if not x_student_id:
        return {"ok": False, "reason": "no student id"}
    try:
        from app.database import supabase_client
        if supabase_client:
            supabase_client.table("reading_progress").upsert({
                "student_id": x_student_id,
                "story_id": story_id,
                "last_page": last_page,
            }, on_conflict="student_id,story_id").execute()
    except Exception as e:
        print(f"[save_progress] failed: {e}")
    return {"ok": True}


class ComprehensionGradeRequest(BaseModel):
    story_text: str
    summary: str
    qa_answers: list  # [{question: str, answer: str}]


@router.post("/grade-comprehension")
async def grade_comprehension(req: ComprehensionGradeRequest):
    """Use Gemini to grade how well the student understood the story."""
    import asyncio
    from google import genai as _genai
    from google.genai import types as _gtypes

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {"score": 50, "feedback": "Could not grade — no API key"}

    qa_block = "\n".join([
        f"Q: {a.get('question','')}\nA: {a.get('answer','')}"
        for a in req.qa_answers if a.get('answer', '').strip()
    ])

    prompt = f"""You are a friendly teacher grading a child's comprehension of a story they just read.

STORY:
{req.story_text[:3000]}

STUDENT'S SUMMARY:
{req.summary[:1000]}

STUDENT'S ANSWERS:
{qa_block[:1500]}

Grade the student's comprehension from 0 to 100 based on:
- Did they understand the main characters and setting?
- Did they understand the key events and plot?
- Did they understand the lesson or theme?
- Are their answers accurate based on the story?

Respond with ONLY valid JSON:
{{"score": <0-100>, "feedback": "<2-3 sentences of encouraging feedback for the child>"}}
"""
    try:
        client = _genai.Client(api_key=api_key)
        response = await asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
            config=_gtypes.GenerateContentConfig(
                response_modalities=["TEXT"],
            ),
        )
        raw = response.candidates[0].content.parts[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        import json
        result = json.loads(raw.strip())
        return {"score": result.get("score", 50), "feedback": result.get("feedback", "Great effort!")}
    except Exception as e:
        print(f"[Comprehension] Grading failed: {e}")
        return {"score": 50, "feedback": "We couldn't grade your answers right now, but great job reading!"}
