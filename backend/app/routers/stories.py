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


class RemoveBackgroundRequest(BaseModel):
    image_url: str   # local path like /char_icons/xyz.png OR remote https:// URL


@router.post("/remove-background")
async def remove_background_endpoint(req: RemoveBackgroundRequest):
    """
    Download an image by URL (local or remote), strip its background server-side
    using rembg (AI-based segmentation) for complex colored backgrounds,
    upload the transparent PNG to Supabase, and return the public URL.
    Returns { transparent_url: str }
    """
    import httpx as _httpx
    from pathlib import Path as _Path
    from app.agents.content_agent import _upload_to_supabase
    import uuid as _uuid
    import asyncio as _asyncio

    url = req.image_url.strip()
    if not url:
        raise HTTPException(400, "image_url is required")

    try:
        # ── Fetch image bytes ─────────────────────────────────────────────────
        if url.startswith("http://") or url.startswith("https://"):
            async with _httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(url)
                if resp.status_code != 200:
                    raise HTTPException(502, f"Could not fetch image: HTTP {resp.status_code}")
                img_bytes = resp.content
        else:
            # Local path like /char_icons/coral_diver.png
            # Strip leading slash and resolve relative to backend working dir
            local_path = _Path(url.lstrip("/"))
            # Also try relative to the frontend public folder
            if not local_path.exists():
                # Try common locations for Vite public assets served at root
                candidates = [
                    _Path("../frontend/public") / url.lstrip("/"),
                    _Path("../readquest/frontend/public") / url.lstrip("/"),
                    _Path("frontend/public") / url.lstrip("/"),
                ]
                for candidate in candidates:
                    if candidate.exists():
                        local_path = candidate
                        break
            if not local_path.exists():
                raise HTTPException(404, f"Local image not found: {url}")
            img_bytes = local_path.read_bytes()

        # ── Remove background using rembg (AI segmentation) ──────────────────
        # rembg handles complex colored/scene backgrounds — unlike the flood-fill
        # which only works for near-white backgrounds.
        def _run_rembg(data: bytes) -> bytes:
            from rembg import remove as rembg_remove
            import io
            result = rembg_remove(data)
            # rembg returns bytes directly as PNG with alpha channel
            return result

        try:
            print(f"[remove-background] Running rembg AI segmentation on {len(img_bytes)} byte image...")
            transparent_bytes = await _asyncio.to_thread(_run_rembg, img_bytes)
            print(f"[remove-background] rembg done — {len(transparent_bytes)} bytes")
        except Exception as rembg_err:
            print(f"[remove-background] rembg failed ({rembg_err}), falling back to flood-fill...")
            from app.agents.content_agent import remove_background_from_bytes
            transparent_bytes = await remove_background_from_bytes(img_bytes)

        # ── Upload to Supabase ────────────────────────────────────────────────
        filename = f"transparent_{_uuid.uuid4().hex}.png"
        public_url = await _upload_to_supabase(transparent_bytes, filename)

        if not public_url:
            # Fallback: serve locally
            from app.agents.content_agent import STATIC_DIR
            STATIC_DIR.mkdir(parents=True, exist_ok=True)
            (STATIC_DIR / filename).write_bytes(transparent_bytes)
            public_url = f"/static/images/{filename}"

        print(f"[remove-background] transparent image ready: {public_url}")
        return {"transparent_url": public_url}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[remove-background] failed: {e}")
        raise HTTPException(500, f"Background removal failed: {str(e)}")


class GenerateRequest(BaseModel):
    grade: int
    theme: str
    character_name: str
    language: str = "english"
    art_style: str = "cartoon"
    character_description: Optional[str] = None
    character_universe: Optional[str] = None
    character_image_url: Optional[str] = None
    sel_theme: Optional[str] = None
    story_mode: str = "free_play"
    is_public: bool = False   # if True, show in public book gallery



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
    """Generate a character portrait — uses Gemini to enrich the character first, then FLUX Dev for the image."""
    import asyncio
    from app.agents.content_agent import _generate_image_nano_banana2, remove_background_from_bytes, _call_gemini_text

    char = req.character.strip()

    # ── Step 1: Use Gemini to identify the character and get their real visual description ──
    char_info = {
        "universe": "Adventure",
        "description": f"{char} — a brave and adventurous hero",
        "visual_appearance": char,
    }
    try:
        gemini_prompt = f"""You are a character identification expert for children's media.

The user typed: "{char}"

Identify this character and respond with ONLY valid JSON (no markdown, no explanation):
{{
  "canonical_name": "<full canonical character name>",
  "universe": "<franchise/show/movie name, e.g. 'DC Comics', 'Frozen (Disney)', 'Marvel Comics'>",
  "description": "<1-2 sentence engaging description of who this character is>",
  "visual_appearance": "<precise visual description: hair color+style, costume/outfit colors and details, any signature features like cape, mask, weapon, etc. Be very specific for image generation.>"
}}

If the character is not well-known, make up a reasonable children's story character appearance.
Reply with only valid JSON."""

        raw = await _call_gemini_text(
            system="You are a character identification expert. Always respond with valid JSON only.",
            user=gemini_prompt,
            temperature=0.1
        )
        # Parse the JSON
        import json, re
        # Strip markdown if present
        clean = raw.strip()
        if "```" in clean:
            clean = re.sub(r"```(?:json)?", "", clean).strip().rstrip("`").strip()
        data = json.loads(clean)
        char_info = {
            "universe": data.get("universe", "Adventure"),
            "description": data.get("description", f"{char} — a brave hero"),
            "visual_appearance": data.get("visual_appearance", char),
            "canonical_name": data.get("canonical_name", char),
        }
        print(f"[analyze-character] Gemini enriched: {char_info}")
    except Exception as e:
        print(f"[analyze-character] Gemini enrichment failed (using defaults): {e}")

    visual = char_info.get("visual_appearance", char)
    canonical = char_info.get("canonical_name", char)

    # ── Step 2: Build a high-quality portrait prompt using the real visual description ──
    image_prompt = (
        f"MASTERPIECE, 8K, high-quality professional children's book illustration of ONE character: {canonical}. "
        f"Visual description: {visual}. "
        f"Single character portrait, HEROIC POSE, clear expressive face, sharp focus, "
        f"CENTERED, full body visible, character ISOLATED. "
        f"PURE SOLID WHITE background ONLY. No scenery, no ground, no sky, NO OTHER CHARACTERS, no pets, no shadows. "
        f"Clean bold line art, bright vivid Disney coloring, HARD black outlines, cel-shaded style, "
        f"unmistakable iconic likeness, highly detailed costume, "
        f"kid-friendly sticker art, extremely sharp, high-res PNG, no text, no logos, no grain."
    )

    # ── Step 3: Generate portrait with FLUX Dev ──
    raw_url = await _generate_image_nano_banana2(image_prompt)
    portrait_url = raw_url

    if raw_url:
        # Fetch bytes and remove background → transparent PNG
        try:
            import httpx as _httpx
            if raw_url.startswith("http"):
                async with _httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(raw_url)
                    img_bytes = resp.content
            else:
                from pathlib import Path
                img_bytes = Path(raw_url.lstrip("/")).read_bytes()

            transparent_bytes = await remove_background_from_bytes(img_bytes)

            from app.agents.content_agent import _upload_to_supabase
            import uuid as _uuid2
            filename = f"portrait_{_uuid2.uuid4().hex}.png"
            public_url = await _upload_to_supabase(transparent_bytes, filename)
            if public_url:
                portrait_url = public_url
            else:
                from pathlib import Path as _Path
                _Path("static/images").mkdir(parents=True, exist_ok=True)
                _Path(f"static/images/{filename}").write_bytes(transparent_bytes)
                portrait_url = f"http://localhost:8000/static/images/{filename}"
        except Exception as e:
            print(f"[analyze-character] Background removal failed (using raw): {e}")

    print(f"[analyze-character] portrait ready: {portrait_url}")

    return {
        "character_name": canonical,
        "universe": char_info["universe"],
        "description": char_info["description"],
        "visual_appearance": char_info.get("visual_appearance", ""),
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
        # ── Sanitize inputs — prevent "no context" Gemini errors on mobile ───
        safe_character = (req.character_name or "").strip()
        safe_theme     = (req.theme or "").strip()

        if not safe_character:
            safe_character = "a brave young hero"
        if not safe_theme:
            safe_theme = "an exciting magical adventure"

        story_data = await generate_story_with_ai(
            grade=req.grade,
            theme=safe_theme,
            character_name=safe_character,
            language=req.language or "english",
            art_style=req.art_style or "cartoon",
            character_description=req.character_description or None,
            character_universe=req.character_universe or None,
            character_image_url=req.character_image_url or None,
        )
    except Exception as e:
        raise HTTPException(500, detail=f"Story generation failed: {str(e)}")

    import uuid as _uuid

    # Persist story to DB — wrapped so a DB failure never kills the response
    story_id = None
    db_pages: list = []
    db_quiz: list = []
    db_cover: Optional[str] = story_data.get("cover_image_url")

    try:
        story = Story(
            student_id=x_student_id,
            title=story_data["title"],
            grade_level=req.grade,
            theme=req.theme,
            cover_media_url=story_data.get("cover_image_url"),
            is_sel_story=bool(req.sel_theme),
            story_mode=req.story_mode,
            art_style=req.art_style or "cartoon",
            is_public=bool(req.is_public),
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

        # ── Post-generation: run SEL agent if sel_theme was requested ────────
        if req.sel_theme:
            try:
                from app.agents.sel_agent import run_sel_agent
                full_story_text = " ".join(
                    p["content"] for p in story_data.get("pages", [])
                )
                sel_result = await run_sel_agent(
                    story_text=full_story_text,
                    story_title=story_data["title"],
                    grade_level=req.grade,
                    requested_theme=req.sel_theme,
                )
                story.sel_tags = sel_result["sel_tags"]
                story.sel_reflections = [
                    {"reflection_prompts": sel_result["reflection_prompts"],
                     "character_guide": sel_result["character_guide"]}
                ]
                await db.commit()
                await db.refresh(story)
            except Exception as sel_err:
                print(f"[generate_story] SEL agent failed (non-fatal): {sel_err}")

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


# ── Landing Page Showcase — returns random books with covers, NO is_public filter ──
@router.get("/showcase")
async def showcase_books(limit: int = 50, db: AsyncSession = Depends(get_session)):
    """Random sample of books for the landing page teaser — no auth, no is_public filter."""
    from app.models.student import Student as StudentModel
    from sqlalchemy import func
    query = (
        select(
            Story.id, Story.title, Story.theme, Story.grade_level,
            Story.cover_media_url, Story.art_style, Story.created_at,
            Story.like_count, Story.view_count,
            StudentModel.id.label("creator_id"),
            StudentModel.name.label("creator_name"),
        )
        .outerjoin(StudentModel, Story.student_id == StudentModel.id)
        .where(Story.cover_media_url.isnot(None))
        .order_by(func.random())
        .limit(min(limit, 100))
    )
    rows = (await db.execute(query)).all()
    return {
        "books": [
            {
                "id": str(r.id),
                "title": r.title,
                "theme": r.theme or "",
                "grade_level": r.grade_level,
                "cover_media_url": r.cover_media_url,
                "art_style": r.art_style or "cartoon",
                "created_at": str(r.created_at) if r.created_at else "",
                "creator_id": str(r.creator_id) if r.creator_id else None,
                "creator_name": r.creator_name or "ReadQuest Reader",
                "like_count": r.like_count or 0,
                "view_count": r.view_count or 0,
            }
            for r in rows
        ],
        "total": len(rows),
    }


# ── Public Books Endpoint (no auth required) — placed BEFORE /{story_id} ──
@router.get("/public")
async def list_public_books(
    search: Optional[str] = None,
    type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_session),
):
    """Return all stories publicly — no auth needed. Supports search and type filter."""
    from app.models.student import Student as StudentModel
    from sqlalchemy import func

    # Base query: stories joined with students for creator name
    query = (
        select(
            Story.id,
            Story.title,
            Story.theme,
            Story.grade_level,
            Story.cover_media_url,
            Story.art_style,
            Story.created_at,
            Story.vote_count,
            Story.view_count,
            Story.like_count,
            StudentModel.id.label("creator_id"),
            StudentModel.name.label("creator_name"),
        )
        .outerjoin(StudentModel, Story.student_id == StudentModel.id)
    )

    if search and search.strip():
        pattern = f"%{search.strip().lower()}%"
        query = query.where(
            func.lower(Story.title).like(pattern)
            | func.lower(Story.theme).like(pattern)
        )

    if type and type.strip() and type.strip().lower() != "all":
        query = query.where(func.lower(Story.art_style) == type.strip().lower())

    query = query.where(Story.cover_media_url.isnot(None))
    query = query.where(Story.is_public == True)  # only show public books
    query = query.order_by(Story.created_at.desc())
    query = query.limit(min(limit, 100)).offset(offset)

    result = await db.execute(query)
    rows = result.all()

    count_query = select(func.count(Story.id)).where(
        Story.cover_media_url.isnot(None),
        Story.is_public == True,
    )
    if search and search.strip():
        pattern = f"%{search.strip().lower()}%"
        count_query = count_query.where(
            func.lower(Story.title).like(pattern)
            | func.lower(Story.theme).like(pattern)
        )
    if type and type.strip() and type.strip().lower() != "all":
        count_query = count_query.where(func.lower(Story.art_style) == type.strip().lower())

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return {
        "books": [
            {
                "id": str(r.id),
                "title": r.title,
                "theme": r.theme or "",
                "grade_level": r.grade_level,
                "cover_media_url": r.cover_media_url,
                "art_style": r.art_style or "cartoon",
                "created_at": str(r.created_at) if r.created_at else "",
                "creator_id": str(r.creator_id) if r.creator_id else None,
                "creator_name": r.creator_name or "ReadQuest Reader",
                "vote_count": r.vote_count or 0,
                "view_count": r.view_count or 0,
                "like_count": r.like_count or 0,
            }
            for r in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


# ── Public Like Endpoint (one-way, no unlike) ────────────────────────────────
class LikeRequest(BaseModel):
    session_key: str
    story_id: str


@router.post("/public/like")
async def like_story(req: LikeRequest, db: AsyncSession = Depends(get_session)):
    """Like a story once per session — idempotent, never decrements."""
    from sqlalchemy import text
    # Insert ignore if already liked
    await db.execute(
        text("INSERT INTO story_likes (session_key, story_id) VALUES (:sk, CAST(:sid AS uuid)) ON CONFLICT DO NOTHING")
        .bindparams(sk=req.session_key, sid=req.story_id)
    )
    # Recalculate like_count from source of truth
    await db.execute(
        text("UPDATE stories SET like_count = (SELECT COUNT(*) FROM story_likes WHERE story_id = CAST(:sid AS uuid)) WHERE id = CAST(:sid AS uuid)")
        .bindparams(sid=req.story_id)
    )
    await db.commit()

    count_row = (await db.execute(
        text("SELECT like_count FROM stories WHERE id = CAST(:sid AS uuid)").bindparams(sid=req.story_id)
    )).fetchone()
    return {"liked": True, "like_count": count_row[0] if count_row else 0}


@router.get("/public/like/{story_id}")
async def get_like_status(story_id: str, session_key: str = "", db: AsyncSession = Depends(get_session)):
    """Get like count + whether this session has already liked."""
    from sqlalchemy import text
    count_row = (await db.execute(
        text("SELECT like_count FROM stories WHERE id = CAST(:sid AS uuid)").bindparams(sid=story_id)
    )).fetchone()
    like_count = count_row[0] if count_row else 0

    already_liked = False
    if session_key:
        row = (await db.execute(
            text("SELECT id FROM story_likes WHERE session_key = :sk AND story_id = CAST(:sid AS uuid)")
            .bindparams(sk=session_key, sid=story_id)
        )).fetchone()
        already_liked = row is not None

    return {"already_liked": already_liked, "like_count": like_count}


@router.get("/public/likes/total")
async def get_total_likes_for_student(student_id: str, db: AsyncSession = Depends(get_session)):
    """Total likes across all stories by a student (for library badge)."""
    from sqlalchemy import text
    row = (await db.execute(
        text("SELECT COALESCE(SUM(like_count), 0) FROM stories WHERE student_id = CAST(:sid AS uuid)")
        .bindparams(sid=student_id)
    )).fetchone()
    return {"total_likes": int(row[0]) if row else 0}


# ── Public View Increment Endpoint ──────────────────────────────────────────
@router.post("/public/view/{story_id}")
async def increment_view(story_id: str, db: AsyncSession = Depends(get_session)):
    """Increment view_count on a story. Fire-and-forget from the client."""
    from sqlalchemy import text
    await db.execute(
        text("UPDATE stories SET view_count = view_count + 1 WHERE id = :sid")
        .bindparams(sid=story_id)
    )
    await db.commit()
    return {"ok": True}


# ── Save-to-Library Endpoints ────────────────────────────────────────────────
class SaveRequest(BaseModel):
    student_id: str
    story_id: str


@router.post("/public/save")
async def save_story(req: SaveRequest, db: AsyncSession = Depends(get_session)):
    """Add a community book to a student's library (idempotent)."""
    from sqlalchemy import text
    await db.execute(
        text("INSERT INTO saved_stories (student_id, story_id) VALUES (CAST(:sid AS uuid), CAST(:stid AS uuid)) ON CONFLICT DO NOTHING")
        .bindparams(sid=req.student_id, stid=req.story_id)
    )
    await db.commit()
    return {"saved": True}


@router.delete("/public/save")
async def unsave_story(req: SaveRequest, db: AsyncSession = Depends(get_session)):
    """Remove a community book from a student's library."""
    from sqlalchemy import text
    await db.execute(
        text("DELETE FROM saved_stories WHERE student_id = CAST(:sid AS uuid) AND story_id = CAST(:stid AS uuid)")
        .bindparams(sid=req.student_id, stid=req.story_id)
    )
    await db.commit()
    return {"saved": False}


@router.get("/public/save/{story_id}")
async def get_save_status(story_id: str, student_id: str, db: AsyncSession = Depends(get_session)):
    """Check if a specific story is saved by this student."""
    from sqlalchemy import text
    row = (await db.execute(
        text("SELECT id FROM saved_stories WHERE student_id = CAST(:sid AS uuid) AND story_id = CAST(:stid AS uuid)")
        .bindparams(sid=student_id, stid=story_id)
    )).fetchone()
    return {"saved": row is not None}


@router.get("/public/saved")
async def list_saved_stories(student_id: str, db: AsyncSession = Depends(get_session)):
    """Return all stories saved to a student's library."""
    from sqlalchemy import text
    from app.models.student import Student as StudentModel
    rows = (await db.execute(
        text("""
            SELECT s.id, s.title, s.grade_level, s.theme, s.cover_media_url,
                   s.art_style, s.created_at, s.like_count,
                   st.name as creator_name, ss.saved_at
            FROM saved_stories ss
            JOIN stories s ON s.id = ss.story_id
            LEFT JOIN students st ON st.id = s.student_id
            WHERE ss.student_id = CAST(:sid AS uuid)
            ORDER BY ss.saved_at DESC
        """).bindparams(sid=student_id)
    )).all()
    return {
        "books": [
            {
                "id": str(r.id),
                "title": r.title,
                "grade_level": r.grade_level,
                "theme": r.theme or "",
                "cover_media_url": r.cover_media_url,
                "art_style": r.art_style or "cartoon",
                "created_at": str(r.created_at) if r.created_at else "",
                "like_count": r.like_count or 0,
                "creator_name": r.creator_name or "ReadQuest Reader",
                "saved_at": str(r.saved_at),
            }
            for r in rows
        ]
    }



class FollowRequest(BaseModel):
    session_key: str
    student_id: str


# ── Public Follow Endpoint ──────────────────────────────────────────────────────
@router.post("/public/follow")
async def follow_creator(req: FollowRequest, db: AsyncSession = Depends(get_session)):
    """Toggle follow for a creator. Returns { following: bool, follower_count: int }"""
    from sqlalchemy import text
    # Check if already following
    existing = (await db.execute(
        text("SELECT id FROM student_follows WHERE session_key = :sk AND student_id = :sid")
        .bindparams(sk=req.session_key, sid=req.student_id)
    )).fetchone()

    if existing:
        await db.execute(
            text("DELETE FROM student_follows WHERE session_key = :sk AND student_id = :sid")
            .bindparams(sk=req.session_key, sid=req.student_id)
        )
        following = False
    else:
        await db.execute(
            text("INSERT INTO student_follows (session_key, student_id) VALUES (:sk, :sid) ON CONFLICT DO NOTHING")
            .bindparams(sk=req.session_key, sid=req.student_id)
        )
        following = True

    await db.commit()

    count_row = (await db.execute(
        text("SELECT COUNT(*) FROM student_follows WHERE student_id = :sid")
        .bindparams(sid=req.student_id)
    )).fetchone()
    follower_count = count_row[0] if count_row else 0

    return {"following": following, "follower_count": int(follower_count)}


@router.get("/public/follow/{student_id}")
async def get_follow_status(student_id: str, session_key: str = "", db: AsyncSession = Depends(get_session)):
    """Get follower count + whether this session is following."""
    from sqlalchemy import text
    count_row = (await db.execute(
        text("SELECT COUNT(*) FROM student_follows WHERE student_id = :sid")
        .bindparams(sid=student_id)
    )).fetchone()
    follower_count = count_row[0] if count_row else 0

    following = False
    if session_key:
        row = (await db.execute(
            text("SELECT id FROM student_follows WHERE session_key = :sk AND student_id = :sid")
            .bindparams(sk=session_key, sid=student_id)
        )).fetchone()
        following = row is not None

    return {"following": following, "follower_count": int(follower_count)}


class VoteRequest(BaseModel):
    story_id: str
    session_key: str  # anonymous browser fingerprint/session ID
    direction: int    # 1 = thumbs up, -1 = thumbs down


# ── Public Vote Endpoint (no auth required) ───────────────────────────────────
@router.post("/public/vote")
async def vote_on_story(
    req: VoteRequest,
    db: AsyncSession = Depends(get_session),
):
    """Let anonymous users vote thumbs up (+1) or thumbs down (-1) on a story.
    Uses session_key to track one vote per session per story.
    Changing direction flips the vote; voting same direction removes it.
    """
    from sqlalchemy import text
    import uuid

    # Validate direction
    if req.direction not in (1, -1):
        raise HTTPException(status_code=400, detail="direction must be 1 or -1")

    try:
        story_id = uuid.UUID(req.story_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid story_id")

    # Check if story exists
    story_result = await db.execute(select(Story).where(Story.id == story_id))
    story = story_result.scalar_one_or_none()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")

    # Check existing vote for this session
    existing_result = await db.execute(
        text("SELECT id, direction FROM story_vote_logs WHERE story_id = :sid AND session_key = :sk")
        .bindparams(sid=story_id, sk=req.session_key)
    )
    existing = existing_result.fetchone()

    vote_delta = 0
    if existing is None:
        # New vote — insert and apply delta
        await db.execute(
            text("INSERT INTO story_vote_logs (story_id, session_key, direction) VALUES (:sid, :sk, :dir)")
            .bindparams(sid=story_id, sk=req.session_key, dir=req.direction)
        )
        vote_delta = req.direction
    elif existing.direction == req.direction:
        # Same direction — remove vote (toggle off)
        await db.execute(
            text("DELETE FROM story_vote_logs WHERE story_id = :sid AND session_key = :sk")
            .bindparams(sid=story_id, sk=req.session_key)
        )
        vote_delta = -req.direction
    else:
        # Changed direction — update and apply double delta
        await db.execute(
            text("UPDATE story_vote_logs SET direction = :dir, updated_at = NOW() WHERE story_id = :sid AND session_key = :sk")
            .bindparams(sid=story_id, sk=req.session_key, dir=req.direction)
        )
        vote_delta = req.direction * 2  # flip: was -1 now +1 = +2 swing

    # Update vote_count — clamp to 0 minimum
    if vote_delta != 0:
        await db.execute(
            text("UPDATE stories SET vote_count = GREATEST(0, vote_count + :delta) WHERE id = :sid")
            .bindparams(delta=vote_delta, sid=story_id)
        )
        await db.commit()

    # Return new count and user's current vote state
    updated_result = await db.execute(select(Story.vote_count).where(Story.id == story_id))
    new_count = updated_result.scalar_one_or_none() or 0

    # Get current vote direction for this session
    current_vote_result = await db.execute(
        text("SELECT direction FROM story_vote_logs WHERE story_id = :sid AND session_key = :sk")
        .bindparams(sid=story_id, sk=req.session_key)
    )
    current_vote_row = current_vote_result.fetchone()
    user_vote = current_vote_row.direction if current_vote_row else 0

    return {"vote_count": new_count, "user_vote": user_vote}


@router.get("")
async def list_stories(x_student_id: Optional[str] = Header(default=None), db: AsyncSession = Depends(get_session)):
    if not x_student_id:
        x_student_id = "guest"

    from app.models.student import Student as StudentModel
    import uuid as _uuid_mod

    # Guard: if the ID isn't a valid UUID, skip DB queries to avoid asyncpg crash
    try:
        _uuid_mod.UUID(x_student_id)
        valid_uuid = True
    except (ValueError, AttributeError):
        valid_uuid = False

    if not valid_uuid:
        return []  # No stories for non-UUID IDs (guest, demo-student-1, etc.)

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


class EditCharacterRequest(BaseModel):
    image_url: str                               # current portrait URL
    prompt: str                                  # edit instruction (e.g. "change hair to curly long black hair")
    character_description: Optional[str] = None  # full character visual description for context


@router.post("/edit-character")
async def edit_character_portrait(req: EditCharacterRequest):
    """
    Image-to-image character editing using fal-ai/flux-pro/kontext.
    Takes existing portrait + edit prompt → returns modified portrait keeping identity.
    """
    import asyncio, os, uuid, httpx
    from app.config import settings
    from app.agents.content_agent import _upload_to_supabase, STATIC_DIR

    fal_key = settings.FAL_AI or os.environ.get("FAL_AI", "")
    if not fal_key:
        raise HTTPException(500, "FAL_AI key not configured")

    os.environ["FAL_KEY"] = fal_key
    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    edit_prompt = (
        f"Edit this character: {req.prompt}. "
        f"Keep the same character identity, face, and pose. "
        f"Do NOT change the character's body or face shape. "
        f"Only modify the requested attribute. "
        f"Maintain the vibrant Roblox/superhero cartoon style."
    )
    if req.character_description:
        edit_prompt += f" Full character context: {req.character_description[:500]}"

    try:
        import fal_client

        # Attempt 1: flux-pro/kontext (image-to-image editing)
        try:
            result = await asyncio.to_thread(
                fal_client.subscribe,
                "fal-ai/flux-pro/kontext",
                arguments={
                    "prompt": edit_prompt[:2000],
                    "image_url": req.image_url,
                    "num_images": 1,
                    "safety_tolerance": "5",
                    "output_format": "png",
                },
            )
            print("[edit-char] Generated with flux-pro/kontext ✓")
        except Exception as kontext_err:
            print(f"[edit-char] kontext failed ({kontext_err}). Trying kontext/max...")
            # Attempt 2: flux-pro/kontext/max
            try:
                result = await asyncio.to_thread(
                    fal_client.subscribe,
                    "fal-ai/flux-pro/kontext/max",
                    arguments={
                        "prompt": edit_prompt[:2000],
                        "image_url": req.image_url,
                        "num_images": 1,
                        "safety_tolerance": "5",
                        "output_format": "png",
                    },
                )
                print("[edit-char] Generated with kontext/max ✓")
            except Exception as max_err:
                print(f"[edit-char] kontext/max failed ({max_err}). Falling back to text-to-image.")
                # Attempt 3: Fall back to text-to-image with full description
                fallback_prompt = (
                    f"MASTERPIECE, 8K, vibrant colorful 2D cartoon illustration. "
                    f"MAIN SUBJECT (full body, sharp, large, centered): {req.character_description or 'a superhero character'}. "
                    f"EDIT: {req.prompt}. "
                    f"Bold clean outlines, bright saturated colors, Roblox cartoon style, no text."
                )
                result = await asyncio.to_thread(
                    fal_client.subscribe,
                    "fal-ai/flux-pro/v1.1-ultra",
                    arguments={
                        "prompt": fallback_prompt[:2000],
                        "aspect_ratio": "1:1",
                        "num_images": 1,
                        "safety_tolerance": "5",
                        "output_format": "png",
                        "raw": False,
                    },
                )
                print("[edit-char] Fell back to flux-pro/ultra text-to-image ✓")

        images = result.get("images", [])
        if not images:
            raise HTTPException(500, "No image returned from AI model")

        fal_url = images[0].get("url")
        if not fal_url:
            raise HTTPException(500, "No URL in AI response")

        # Download and upload to Supabase
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(fal_url)
            if resp.status_code != 200:
                raise HTTPException(500, "Failed to download generated image")
            img_bytes = resp.content

        filename = f"{uuid.uuid4().hex}.png"
        public_url = await _upload_to_supabase(img_bytes, filename)
        if public_url:
            return {"portrait_url": public_url}

        (STATIC_DIR / filename).write_bytes(img_bytes)
        return {"portrait_url": f"/static/images/{filename}"}

    except HTTPException:
        raise
    except Exception as e:
        print(f"[edit-char] Error: {e}")
        raise HTTPException(500, f"Character edit failed: {str(e)}")


class GenerateBackgroundRequest(BaseModel):
    theme: str
    character_name: Optional[str] = None      # when set, portrait is also generated
    scene_description: Optional[str] = None   # user-typed scene detail, woven into portrait
    character_description: Optional[str] = None  # precise visual description from gallery visualDesc
    art_style: Optional[str] = None           # avatar art style: cartoon|comic|pixar|cinematic|real|epic


@router.post("/generate-background")
async def generate_theme_background(req: GenerateBackgroundRequest):
    """
    Generate a wide cinematic background + optional combined character portrait.
    Portrait is only generated when character_name is provided.
    Returns { background_url: str | None, portrait_url: str | None }
    """
    import asyncio
    import os
    from app.agents.content_agent import _generate_image_nano_banana2

    bg_prompt = (
        "Ultra-wide cinematic panoramic children's book background illustration. "
        "No characters, no text, no people. "
        f"Theme: {req.theme}. "
        "Lush, vibrant colors, dreamy atmosphere, Pixar storybook art style, "
        "highly detailed, magical lighting, golden hour, volumetric light rays, "
        "safe for kids, whimsical and enchanting."
    )

    portrait_prompt: Optional[str] = None
    if req.character_name:
        char_visual = (
            f"{req.character_name} — {req.character_description}"
            if req.character_description else req.character_name
        )
        scene_detail = f" The scene: {req.scene_description.strip()}." if req.scene_description else ""
        art_style = (req.art_style or "cartoon").lower().strip()

        # Style-specific portrait prompt templates — each tuned for FLUX to produce
        # the most faithful rendering of the user's description in that visual style
        AVATAR_STYLE_PROMPTS = {
            "cartoon": (
                "MASTERPIECE, 8K, vibrant colorful 2D cartoon illustration, professional character design. "
                f"MAIN SUBJECT (full body, sharp, large, centered): {char_visual}. "
                f"Setting: {req.theme} world.{scene_detail} "
                "Bold clean ink outlines, bright saturated colors, expressive face, "
                "dynamic heroic pose, detailed magical background matching the theme, "
                "children's book art quality, no text, no logos, safe for kids."
            ),
            "comic": (
                "MASTERPIECE, 8K, dynamic Marvel/DC comic book splash page art, high energy. "
                f"MAIN HERO (full body, bold ink, center foreground, action pose): {char_visual}. "
                f"Setting: {req.theme} world.{scene_detail} "
                "Vivid primary colors, speed lines, cross-hatching shading, "
                "ben-day dots, professional comic inking, dramatic lighting, "
                "iconic superhero composition, no text, no logos."
            ),
            "pixar": (
                "MASTERPIECE, 8K, Pixar/Disney Animation 3D CGI render — NOT 2D cartoon. "
                f"MAIN CHARACTER (full body foreground, expressive, highly detailed): {char_visual}. "
                f"Setting: {req.theme} world.{scene_detail} "
                "Subsurface scattering skin, soft global illumination, "
                "depth of field, Disney-quality rigging detail, magical atmosphere, "
                "Pixar studio render, kid-friendly, no text."
            ),
            "cinematic": (
                "MASTERPIECE, 8K, ultra-realistic Hollywood cinematic photo — NOT cartoon. "
                f"HERO (large foreground, dynamic 3D presence, photorealistic detail): {char_visual}. "
                f"Setting: {req.theme} world.{scene_detail} "
                "Dramatic volumetric lighting, IMAX quality, film grain, "
                "sharp focus, cinematic color grade, movie poster composition, "
                "hyperrealistic textures, no text, no logos."
            ),
            "real": (
                "MASTERPIECE, 8K, gritty photorealistic documentary photography — NOT illustrated. "
                f"SUBJECT (full body, raw intense detail, center frame): {char_visual}. "
                f"Setting: {req.theme} world.{scene_detail} "
                "Natural lighting, sharp detail, wet textures, "
                "editorial photography style, high dynamic range, "
                "real fabric and skin texture, no text."
            ),
            "epic": (
                "MASTERPIECE, 8K, blockbuster IMAX movie key art, epic poster quality. "
                f"HERO (grand heroic silhouette, center, glowing power aura): {char_visual}. "
                f"Setting: {req.theme} world.{scene_detail} "
                "Catastrophic dramatic sky, atmospheric dust, color-graded, "
                "cinematic master shot, godray lighting, "
                "poster-grade composition, no text, no logos."
            ),
        }
        portrait_prompt = AVATAR_STYLE_PROMPTS.get(art_style, AVATAR_STYLE_PROMPTS["cartoon"])

    async def _gen_avatar_high_quality(prompt: str) -> Optional[str]:
        """Generate avatar using the best available model: ultra → pro → dev."""
        from app.config import settings
        fal_key = settings.FAL_AI or os.environ.get("FAL_AI", "")
        if not fal_key:
            return None
        try:
            import fal_client
            os.environ["FAL_KEY"] = fal_key
            result = None

            # 1️⃣ Try flux-pro/v1.1-ultra — best quality, most faithful to prompt
            try:
                result = await asyncio.to_thread(
                    fal_client.subscribe,
                    "fal-ai/flux-pro/v1.1-ultra",
                    arguments={
                        "prompt": prompt[:2000],
                        "aspect_ratio": "1:1",
                        "num_images": 1,
                        "safety_tolerance": "5",
                        "output_format": "png",
                        "raw": False,
                    },
                )
                print("[avatar] Generated with flux-pro/v1.1-ultra ✓")
            except Exception as ultra_err:
                print(f"[avatar] flux-pro/v1.1-ultra failed ({ultra_err}), trying flux-pro...")
                # 2️⃣ Fallback: flux-pro
                try:
                    result = await asyncio.to_thread(
                        fal_client.subscribe,
                        "fal-ai/flux-pro",
                        arguments={
                            "prompt": prompt[:1000],
                            "image_size": "square_hd",
                            "num_inference_steps": 40,
                            "guidance_scale": 3.5,
                            "num_images": 1,
                            "safety_tolerance": "5",
                            "output_format": "png",
                        },
                    )
                    print("[avatar] Generated with flux-pro ✓")
                except Exception as pro_err:
                    print(f"[avatar] flux-pro failed ({pro_err}), falling back to flux/dev")
                    # 3️⃣ Last resort: flux/dev
                    result = await asyncio.to_thread(
                        fal_client.subscribe,
                        "fal-ai/flux/dev",
                        arguments={
                            "prompt": prompt[:600],
                            "image_size": "square_hd",
                            "num_inference_steps": 28,
                            "guidance_scale": 4.5,
                            "num_images": 1,
                            "enable_safety_checker": True,
                            "output_format": "png",
                        },
                    )
            images = result.get("images", [])
            if not images:
                return None
            fal_url = images[0].get("url")
            if not fal_url:
                return None
            import httpx, uuid
            from app.agents.content_agent import _upload_to_supabase, STATIC_DIR
            STATIC_DIR.mkdir(parents=True, exist_ok=True)
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(fal_url)
                if resp.status_code != 200:
                    return None
                img_bytes = resp.content
            filename = f"{uuid.uuid4().hex}.png"
            public_url = await _upload_to_supabase(img_bytes, filename)
            if public_url:
                return public_url
            (STATIC_DIR / filename).write_bytes(img_bytes)
            return f"/static/images/{filename}"
        except Exception as e:
            print(f"[avatar] Generation failed: {e}")
            return None

    # Fire both in parallel — portrait only when character_name given
    if portrait_prompt:
        bg_url, portrait_url = await asyncio.gather(
            _generate_image_nano_banana2(bg_prompt),
            _gen_avatar_high_quality(portrait_prompt),
        )
    else:
        bg_url = await _generate_image_nano_banana2(bg_prompt)
        portrait_url = None

    return {"background_url": bg_url, "portrait_url": portrait_url}


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
    from app.config import settings

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
