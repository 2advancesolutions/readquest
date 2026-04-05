"""Stories router — generate, list, get"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.story import Story, StoryPage
from app.models.character_portrait import CharacterPortrait
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
    art_style: str = "cartoon"


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
    """Generate a character portrait using Recraft V3.
    Checks the character_portraits DB cache first — if found, returns instantly.
    """
    from app.agents.content_agent import _generate_image_nano_banana2, remove_background_from_bytes
    from app.database import AsyncSessionLocal

    char = req.character.strip()
    art_style = req.art_style or "cartoon"
    cache_key = char.lower().strip()

    print(f"[analyze-character] char='{char}', art_style='{art_style}'")

    # ── 1. Check server-side portrait cache ───────────────────────────────────
    try:
        async with AsyncSessionLocal() as cache_db:
            cached = await cache_db.execute(
                select(CharacterPortrait).where(CharacterPortrait.name == cache_key)
            )
            cached_row = cached.scalar_one_or_none()
            if cached_row:
                print(f"[analyze-character] ✓ Cache hit for '{char}' — returning instantly")
                return {
                    "character_name": char,
                    "universe": "Original",
                    "description": f"{char} — ready for an epic adventure!",
                    "visual_appearance": char,
                    "character_image_url": cached_row.portrait_url,
                    "cached": True,
                }
    except Exception as cache_err:
        print(f"[analyze-character] Cache lookup failed (non-fatal): {cache_err}")

    # ── Known character visual descriptions (no Gemini) ──────────────────────────
    # For well-known characters, inject their real visual so Recraft renders them
    # recognizably. Keyed by lowercase name. Custom names fall back to the name itself.
    KNOWN_CHARACTERS: dict[str, str] = {
        # Marvel
        "iron man":        "Iron Man in iconic red and gold metal armor suit, arc reactor glowing blue on chest, full helmet on, heroic pose",
        "spider-man":      "Spider-Man in red and blue spandex suit with web pattern, black spider logo on chest, full mask on",
        "spiderman":       "Spider-Man in red and blue spandex suit with web pattern, black spider logo on chest, full mask on",
        "spider man":      "Spider-Man in red and blue spandex suit with web pattern, black spider logo on chest, full mask on",
        "captain america": "Captain America in blue suit with red and white stripes, star on chest, round vibranium shield",
        "thor":            "Thor with long blonde hair, red flowing cape, winged helmet, holding Mjolnir hammer, muscular warrior",
        "hulk":            "The Hulk, massive green muscular giant, purple torn pants, angry expression, enormous green physique",
        "black panther":   "Black Panther in sleek black vibranium suit with claw gauntlets and silver trim, full mask on",
        "captain marvel":  "Captain Marvel in red blue and gold suit, star emblem on chest, short blonde hair, determined expression",
        "thanos":          "Thanos, giant purple-skinned alien warlord, golden Infinity Gauntlet with six Infinity Stones, heavy armor",
        "deadpool":        "Deadpool in red and black mercenary suit, twin katanas on back, full mask on, thumbs up pose",
        "wolverine":       "Wolverine with three adamantium metal claws extended from each fist, blue and yellow X-Men suit, wild brown hair",
        "venom":           "Venom, massive black symbiote figure, white spider logo, long tongue, razor sharp teeth",
        # DC
        "batman":          "Batman in dark grey armored bat-suit, large black cape and cowl, gold utility belt, bat logo on chest",
        "superman":        "Superman in blue suit, flowing red cape, yellow and red S shield on chest, hands on hips heroic stance",
        "wonder woman":    "Wonder Woman in red and gold armor, golden tiara, golden lasso at hip, silver bracelets, long dark hair",
        "the flash":       "The Flash in bright red suit with lightning bolt logo, gold accents, yellow boots, running stance",
        "aquaman":         "Aquaman in orange and green scale armor, long blonde hair, holding tall golden trident",
        "joker":           "The Joker in purple suit and green tie, bright green hair, white face makeup, red lipstick smile",
        "green lantern":   "Green Lantern in green and black suit, glowing green power ring on right hand, green power symbol",
        # Disney / Pixar
        "elsa":            "Elsa in ice-blue sparkly flowing gown, platinum blonde side braid, ice crown, magical ice sparkling from hands",
        "anna":            "Anna in blue and magenta folk dress, auburn pigtail braids, freckles, warm friendly smile",
        "moana":           "Moana in red and white tapa cloth outfit, long wavy thick black hair, holding green heart of Te Fiti",
        "simba":           "Adult Simba as majestic lion with full golden mane, warm amber eyes, proud stance on Pride Rock",
        "woody":           "Woody the cowboy in yellow cowboy hat with red band, plaid shirt, denim jeans, sheriff badge",
        "buzz lightyear":  "Buzz Lightyear in white green and purple space ranger armor suit, retractable wings, clear helmet",
        "mickey mouse":    "Mickey Mouse, black cartoon mouse, round ears, red shorts with white buttons, yellow shoes, white gloves",
        # Nintendo
        "mario":           "Mario in red cap with white M logo, blue overalls, red shirt, brown mustache, cheerful jumping pose",
        "luigi":           "Luigi in green cap with white L logo, blue overalls, green shirt, tall slim build, friendly smile",
        "link":            "Link in green tunic and pointed green hat, pointy elf ears, blonde hair, holding glowing Master Sword and Hylian Shield",
        "zelda":           "Princess Zelda in royal gold and white gown, long blonde hair, pointed tiara, Triforce symbol",
        "pikachu":         "Pikachu, small yellow mouse Pokemon, round red cheek pouches, pointed black-tipped ears, lightning bolt tail",
        "kirby":           "Kirby, round fluffy pink puffball character, small stubby arms, blue eyes, rosy cheek blushes",
        # Other
        "sonic":           "Sonic the Hedgehog, bright blue spiky fur, white gloves, signature red sneakers, speed running pose",
        "goku":            "Goku in orange martial arts gi with blue undershirt, spiky black hair or golden Super Saiyan hair, muscular",
        "naruto":          "Naruto in bright orange and black tracksuit, leaf village metal headband, blonde spiky hair, whisker marks on cheeks",
        "luffy":           "Monkey D. Luffy in red vest, blue shorts, straw hat, black hair, rubber body stretching pose",
    }

    char_lower = char.lower().strip()
    visual = KNOWN_CHARACTERS.get(char_lower, char)
    if visual != char:
        print(f"[analyze-character] Known character: '{char}' → preset visual")
    else:
        print(f"[analyze-character] Custom character: '{char}' → using name literally")

    # ── Clean the visual for portrait prompts ───────────────────────────────────────────────
    # Strip action/location phrases that cause Recraft to add background scenery:
    # e.g. "girl with wings that flies in the sky" → "girl with wings"
    import re as _re
    visual_clean = visual
    visual_clean = _re.sub(r'\b(in|on|above|over|through|across|under)\s+the\s+\w+', '', visual_clean, flags=_re.IGNORECASE)
    visual_clean = _re.sub(r'\b(that|who)\s+\w+s?\b', '', visual_clean, flags=_re.IGNORECASE)
    visual_clean = ' '.join(visual_clean.split())
    if visual_clean != visual:
        print(f"[analyze-character] visual_clean='{visual_clean}'")

    # Key rules for Recraft V3 portraits:
    # • Character FILLS the frame (LARGE, not tiny floating figure)
    # • WHITE background repeated multiple times — overrides any location hints in the name
    # • "No scenery" stated explicitly
    PORTRAIT_PROMPTS = {
        "cartoon": (
            f"Full-body character illustration, character filling the entire frame: {visual_clean}. "
            f"LARGE centered figure, close-up full body, expressive face, confident heroic pose. "
            f"PURE SOLID WHITE background only. No sky, no scenery, no ground, no background elements. "
            f"Bold clean outlines, bright vivid colors, Disney-style 2D cartoon."
        ),
        "pixar": (
            f"Full-body 3D character portrait, character filling the entire frame: {visual_clean}. "
            f"LARGE centered figure, expressive Pixar-style face, close-up full body. "
            f"PURE SOLID WHITE background only. No sky, no scenery, no background elements. "
            f"Pixar CGI style, clay-like texture, soft warm lighting, vibrant colors."
        ),
        "cinematic": (
            f"Full-body cinematic character portrait, character filling the entire frame: {visual_clean}. "
            f"LARGE centered figure, dramatic heroic stance, sharp photorealistic detail. "
            f"PURE SOLID WHITE background only. No sky, no scenery, no environment. "
            f"Film poster lighting, cinematic shadows, ultra-detailed."
        ),
        "real": (
            f"Full-body photorealistic character portrait, character filling the entire frame: {visual_clean}. "
            f"LARGE centered figure, natural confident pose, sharp detail. "
            f"PURE SOLID WHITE background only. No sky, no scenery, no background elements. "
            f"Natural studio lighting, photorealistic textures."
        ),
        "comic": (
            f"Full-body comic book character, character filling the entire frame: {visual_clean}. "
            f"LARGE centered figure, dynamic action pose, bold thick ink outlines. "
            f"PURE SOLID WHITE background only. No sky, no scenery, no environment. "
            f"Marvel/DC comic art style, vivid primary colors."
        ),
        "epic": (
            f"Full-body epic fantasy character portrait, character filling the entire frame: {visual_clean}. "
            f"LARGE centered figure, triumphant heroic pose, dramatic presence. "
            f"PURE SOLID WHITE background only. No sky, no scenery, no background. "
            f"Cinematic fantasy art, detailed and dramatic."
        ),
    }
    image_prompt = PORTRAIT_PROMPTS.get(art_style, PORTRAIT_PROMPTS["cartoon"])
    print(f"[analyze-character] Recraft V3 portrait prompt: {image_prompt}")

    # ── Generate portrait with Recraft V3 using the user's selected style ──────────
    raw_url = await _generate_image_nano_banana2(image_prompt, art_style=art_style)
    portrait_url = raw_url

    if raw_url:
        # ── Use fal.ai cloud rembg — handles ANY background type (dark, color, scene) ──
        try:
            import os as _os, asyncio as _asyncio
            import fal_client as _fal_client
            _os.environ["FAL_KEY"] = settings.FAL_AI or _os.environ.get("FAL_AI", "")

            print(f"[analyze-character] Calling fal rembg on: {raw_url[:80]}...")
            rembg_result = await _asyncio.to_thread(
                _fal_client.subscribe,
                "fal-ai/imageutils/rembg",
                arguments={"image_url": raw_url},
            )
            transparent_url = (rembg_result or {}).get("image", {}).get("url")
            if transparent_url:
                print(f"[analyze-character] fal rembg ✓ transparent: {transparent_url[:80]}")
                portrait_url = transparent_url
            else:
                print(f"[analyze-character] fal rembg returned no URL — using raw")
        except Exception as e:
            print(f"[analyze-character] fal rembg failed ({e}) — falling back to local removal")
            # Local fallback: download + Pillow flood-fill
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
                if len(transparent_bytes) > 8000:
                    from app.agents.content_agent import _upload_to_supabase
                    import uuid as _uuid2
                    filename = f"portrait_{_uuid2.uuid4().hex}.png"
                    public_url = await _upload_to_supabase(transparent_bytes, filename)
                    if public_url:
                        portrait_url = public_url
            except Exception as e2:
                print(f"[analyze-character] Local bg removal also failed ({e2}) — using raw URL")

    print(f"[analyze-character] portrait ready: {portrait_url}")

    response = {
        "character_name": char,
        "universe": "Original",
        "description": f"{char} — ready for an epic adventure!",
        "visual_appearance": visual,
        "character_image_url": portrait_url,
        "scenes": [],
    }

    # ── Save to portrait cache for instant reuse next time ─────────────────────
    try:
        async with AsyncSessionLocal() as save_db:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            stmt = pg_insert(CharacterPortrait).values(
                name=cache_key,
                portrait_url=portrait_url,
                art_style=art_style,
            ).on_conflict_do_nothing(index_elements=["name"])
            await save_db.execute(stmt)
            await save_db.commit()
            print(f"[analyze-character] ✓ Portrait cached: '{char}' → {portrait_url[:60]}...")
    except Exception as save_err:
        print(f"[analyze-character] Cache save failed (non-fatal): {save_err}")

    return response


@router.get("/status/{story_id}")
async def get_story_status(
    story_id: str,
    db: AsyncSession = Depends(get_session)
):
    """
    Lightweight polling endpoint — returns which page images are ready.
    App polls this every 3s while reading; shimmers fade to real images as they arrive.
    No auth required (story_id is effectively a secret token).
    """
    try:
        pages_result = await db.execute(
            select(StoryPage.page_number, StoryPage.media_url)
            .where(StoryPage.story_id == story_id)
            .order_by(StoryPage.page_number)
        )
        pages = pages_result.all()

        if not pages:
            # Story not found or still being created
            return {"cover_ready": False, "pages": [], "all_ready": False}

        story_result = await db.execute(
            select(Story.cover_media_url).where(Story.id == story_id)
        )
        story_row = story_result.first()
        cover_ready = bool(story_row and story_row[0])

        page_statuses = [bool(p.media_url) for p in pages]
        all_ready = cover_ready and all(page_statuses)

        return {
            "cover_ready": cover_ready,
            "pages": page_statuses,
            "all_ready": all_ready,
        }
    except Exception as e:
        print(f"[story_status] Error: {e}")
        return {"cover_ready": False, "pages": [], "all_ready": False}



@router.post("/generate")
async def generate_story(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session)
):
    """Generate an AI story — Phase 1 (text + cover) returns fast, Phase 2 (page images) runs in background."""
    if not x_student_id:
        x_student_id = "guest"

    # ── Ensure student row exists & resolve to correct child ID ──────────────
    # If x_student_id is a student UUID → use as-is.
    # If x_student_id is a parent UUID → look up their first real child and
    #   redirect the story to that child (prevents ghost-student accumulation).
    # Only creates a ghost student as absolute last resort (no children exist).
    try:
        from app.models.student import Student as StudentModel
        from app.models.parent import Parent as ParentModel
        import uuid as _uuid_guard

        try:
            _uuid_guard.UUID(x_student_id)
            is_valid_uuid = True
        except (ValueError, AttributeError):
            is_valid_uuid = False

        if is_valid_uuid:
            stu_check = await db.execute(
                select(StudentModel).where(StudentModel.id == x_student_id)
            )
            if not stu_check.scalar_one_or_none():
                # x_student_id is not a known student — likely a parent UUID.
                # Redirect to first real child so story lands under the right account.
                kids_check = await db.execute(
                    select(StudentModel).where(StudentModel.parent_id == x_student_id).limit(1)
                )
                real_child = kids_check.scalar_one_or_none()
                if real_child:
                    print(f"[generate_story] Redirecting story → child {real_child.id} ({real_child.name})")
                    x_student_id = str(real_child.id)
                else:
                    # No children — create ghost as last resort
                    par_check = await db.execute(
                        select(ParentModel).where(ParentModel.id == x_student_id)
                    )
                    if not par_check.scalar_one_or_none():
                        db.add(ParentModel(id=x_student_id, first_name="User", last_name=""))
                        await db.flush()
                    db.add(StudentModel(
                        id=x_student_id, parent_id=x_student_id,
                        name="Student", grade_level=req.grade,
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

        # ── Phase 1 — FAST: story text + cover only (~20-25s) ─────────────────
        from app.services.ai_service import generate_story_phase1, generate_page_images_background
        story_data = await generate_story_phase1(
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

    # ── Phase 2 — background: page images generate while user watches loader ──
    # The frontend polls /api/stories/{id} every 2s and shows each image as
    # it arrives. Navigation to reader is gated until all 5 images are ready.
    if story_id and db_pages:
        phase2_pages = [
            {
                "page_id": p.id,
                "page_number": p.page_number,
                "content": p.content,
            }
            for p in db_pages
        ]
        background_tasks.add_task(
            generate_page_images_background,
            story_id=story_id,
            pages=phase2_pages,
            character_visual=story_data.get("character_visual") or safe_character,
            character_image_url=req.character_image_url or None,
            art_style=req.art_style or "cartoon",
            theme=safe_theme,
        )
        print(f"[generate_story] ✓ Phase 2 background task queued for {len(phase2_pages)} pages")

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
        text("SELECT id FROM student_follows WHERE session_key = :sk AND student_id = CAST(:sid AS uuid)")
        .bindparams(sk=req.session_key, sid=req.student_id)
    )).fetchone()

    if existing:
        await db.execute(
            text("DELETE FROM student_follows WHERE session_key = :sk AND student_id = CAST(:sid AS uuid)")
            .bindparams(sk=req.session_key, sid=req.student_id)
        )
        following = False
    else:
        await db.execute(
            text("INSERT INTO student_follows (session_key, student_id) VALUES (:sk, CAST(:sid AS uuid)) ON CONFLICT DO NOTHING")
            .bindparams(sk=req.session_key, sid=req.student_id)
        )
        following = True

    await db.commit()

    count_row = (await db.execute(
        text("SELECT COUNT(*) FROM student_follows WHERE student_id = CAST(:sid AS uuid)")
        .bindparams(sid=req.student_id)
    )).fetchone()
    follower_count = count_row[0] if count_row else 0

    return {"following": following, "follower_count": int(follower_count)}


@router.get("/public/follow/{student_id}")
async def get_follow_status(student_id: str, session_key: str = "", db: AsyncSession = Depends(get_session)):
    """Get follower count + whether this session is following."""
    from sqlalchemy import text
    count_row = (await db.execute(
        text("SELECT COUNT(*) FROM student_follows WHERE student_id = CAST(:sid AS uuid)")
        .bindparams(sid=student_id)
    )).fetchone()
    follower_count = count_row[0] if count_row else 0

    following = False
    if session_key:
        row = (await db.execute(
            text("SELECT id FROM student_follows WHERE session_key = :sk AND student_id = CAST(:sid AS uuid)")
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
        # Guard: only run the parent query if the ID is a valid UUID
        try:
            import uuid as _uuid_inner
            _uuid_inner.UUID(x_student_id)
            kids_result = await db.execute(
                select(StudentModel.id).where(StudentModel.parent_id == x_student_id)
            )
            kid_ids = [row[0] for row in kids_result.all()]
            ids_to_query.update(kid_ids)
        except (ValueError, AttributeError):
            pass  # non-UUID parent ID — skip parent lookup

    result = await db.execute(
        select(Story)
        .where(Story.student_id.in_(list(ids_to_query)))
        .order_by(Story.created_at.desc())
    )
    stories = list(result.scalars().all())

    if not stories:
        return []

    story_ids = [s.id for s in stories]

    # ── BULK: first page image for stories with no cover (1 query, not N) ──────
    from sqlalchemy import func as _func
    first_page_rows = await db.execute(
        select(StoryPage.story_id, StoryPage.media_url)
        .where(
            StoryPage.story_id.in_(story_ids),
            StoryPage.page_number == 1,
        )
    )
    first_page_map: dict = {str(r.story_id): r.media_url for r in first_page_rows.all() if r.media_url}

    # ── BULK: max page number per story for progress % (1 query, not N) ────────
    page_count_rows = await db.execute(
        select(StoryPage.story_id, _func.max(StoryPage.page_number).label("max_page"))
        .where(StoryPage.story_id.in_(story_ids))
        .group_by(StoryPage.story_id)
    )
    page_count_map: dict = {str(r.story_id): (r.max_page or 0) for r in page_count_rows.all()}

    # ── Reading progress (Supabase client — already 1 query) ────────────────────
    progress_map: dict = {}
    try:
        from app.database import supabase_client
        if supabase_client:
            prog_resp = supabase_client.table("reading_progress") \
                .select("story_id,last_page,completed_at") \
                .eq("student_id", x_student_id) \
                .in_("story_id", [str(sid) for sid in story_ids]) \
                .execute()
            for row in (prog_resp.data or []):
                progress_map[row["story_id"]] = row
    except Exception as e:
        print(f"[list_stories] progress fetch failed (non-fatal): {e}")

    # ── Assemble response from pre-fetched maps (no more per-story queries) ─────
    out = []
    for s in stories:
        sid = str(s.id)
        cover = s.cover_media_url or first_page_map.get(sid)
        page_count = page_count_map.get(sid, 0)

        prog = progress_map.get(sid, {})
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


class ExpandStoryRequest(BaseModel):
    seed_text: str          # User's typed prompt / seed idea
    character_name: str     # Selected character name to weave in
    grade: int = 3          # Reading level for vocabulary complexity


@router.post("/expand-story")
async def expand_story(req: ExpandStoryRequest):
    """
    Use Gemini to expand a short user prompt into a full children's short story.
    The story stars the selected character and is written for the given grade level.
    Returns { story: str }
    """
    from app.agents.content_agent import _call_gemini_text

    seed = req.seed_text.strip()[:1000]  # cap input
    char = req.character_name.strip() or "the hero"
    grade = max(1, min(req.grade, 12))

    # Comprehensive grade-level reading guidance (Lexile-aligned)
    grade_profiles = {
        1: {
            "label": "Grade 1 (Lexile 200–400)",
            "vocab": "only very simple everyday words (go, run, big, happy, dog, tree, jump)",
            "sentences": "extremely short sentences of 4–6 words — maximum 1 idea per sentence",
            "length": "100–140 words",
            "tone": "very playful and simple, like a picture book",
            "example": "'The dog ran fast. It jumped over the rock.'",
        },
        2: {
            "label": "Grade 2 (Lexile 400–600)",
            "vocab": "simple words plus slightly longer words (adventure, excited, discover, forest)",
            "sentences": "short sentences of 6–10 words — occasionally join two ideas with 'and' or 'but'",
            "length": "140–200 words",
            "tone": "friendly, warm, and encouraging",
            "example": "'The little dragon found a hidden path and wanted to explore.'",
        },
        3: {
            "label": "Grade 3 (Lexile 600–800)",
            "vocab": "familiar words plus grade-appropriate words (brave, journey, mysterious, problem, discover)",
            "sentences": "varied sentences of 8–14 words — mix short punchy sentences with longer ones",
            "length": "200–280 words",
            "tone": "exciting and imaginative with some descriptive details",
            "example": "'The mysterious cave sparkled with crystals, and the brave hero stepped inside carefully.'",
        },
        4: {
            "label": "Grade 4 (Lexile 800–980)",
            "vocab": "richer vocabulary (determined, enormous, glittering, transformed, ancient, victorious)",
            "sentences": "well-structured sentences of 10–18 words — use descriptive phrases and some dialogue",
            "length": "260–340 words",
            "tone": "adventurous and descriptive with vivid imagery",
            "example": "'\"We must find the ancient scroll,\" said the determined warrior, scanning the enormous horizon.'",
        },
        5: {
            "label": "Grade 5 (Lexile 980–1100)",
            "vocab": "strong descriptive words (relentless, magnificent, treacherous, astonished, legendary)",
            "sentences": "confident varied sentences up to 20 words — use metaphors, similes, and natural dialogue",
            "length": "300–400 words",
            "tone": "rich and cinematic with emotional depth",
            "example": "'Like a comet blazing through the sky, the legendary hero charged forward without hesitation.'",
        },
        6: {
            "label": "Grade 6 (Lexile 1100–1200)",
            "vocab": "sophisticated vocabulary (unyielding, formidable, revelation, perseverance, strategically)",
            "sentences": "complex and compound-complex sentences — include vivid sensory details and inner monologue",
            "length": "320–420 words",
            "tone": "dramatic and layered with character emotion shown through action",
            "example": "'The formidable challenge seemed insurmountable, yet something within the hero refused to yield.'",
        },
        7: {
            "label": "Grade 7 (Lexile 1200–1300)",
            "vocab": "mature vocabulary (inevitable, resilience, paradox, sovereign, catalyst)",
            "sentences": "sophisticated flowing sentences with subordinate clauses and strong narrative voice",
            "length": "350–450 words",
            "tone": "nuanced and atmospheric, exploring cause-and-effect and character growth",
            "example": "'The hero's resilience became the catalyst for an unexpected and hard-won victory.'",
        },
    }
    # Grades 8-12: same advanced profile
    advanced = {
        "label": f"Grade {grade} (Lexile 1300+)",
        "vocab": "advanced literary vocabulary (unequivocal, transcendent, tenacious, unprecedented)",
        "sentences": "masterful prose with rhetorical devices — parallel structure, varied rhythm, powerful imagery",
        "length": "380–480 words",
        "tone": "literary and compelling with thematic depth and a memorable closing line",
        "example": "'In the face of unprecedented storm, the hero stood unequivocal — a testament to tenacious spirit.'",
    }
    profile = grade_profiles.get(grade, advanced)

    system_prompt = (
        "You are an award-winning children's book author and literacy specialist. "
        "You write engaging, imaginative stories precisely tuned to specific reading levels. "
        "Your stories are always safe, positive, and inspiring for children. "
        "Never include violence, adult themes, or scary content."
    )

    grad_label = profile['label']
    user_prompt = (
        f"Write a children's story for READING LEVEL: {grad_label}.\n\n"
        f"STORY IDEA: \"{seed}\"\n\n"
        f"STRICT GRADE-LEVEL RULES:\n"
        f"- Vocabulary: {profile['vocab']}\n"
        f"- Sentences: {profile['sentences']}\n"
        f"- Target length: {profile['length']}\n"
        f"- Tone: {profile['tone']}\n"
        f"- Example sentence style: {profile['example']}\n\n"
        f"STORY RULES:\n"
        f"- The MAIN CHARACTER must be named {char} — they must be central to the story\n"
        f"- Clear beginning (set the scene), middle (a challenge or adventure), end (resolution)\n"
        f"- Write in flowing paragraphs — NO chapter headings, NO bullets, NO lists\n"
        f"- End with an uplifting, satisfying conclusion\n"
        f"- Output ONLY the story paragraphs — no title, no labels"
    )

    try:
        # Lower temp for early grades (predictable simple words), higher for advanced (richer prose)
        temp = 0.65 if grade <= 2 else (0.75 if grade <= 4 else 0.85)
        story_text = await _call_gemini_text(
            system=system_prompt,
            user=user_prompt,
            temperature=temp,
        )
        story_text = story_text.strip()
        if len(story_text) < 50:
            raise HTTPException(500, "AI returned too short a response")
        print(f"[expand-story] {profile['label']}: {len(story_text)} chars, temp={temp}")
        return {"story": story_text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[expand-story] Error: {e}")
        raise HTTPException(500, f"Story generation failed: {str(e)}")


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
