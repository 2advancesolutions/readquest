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
    image_url: Optional[str] = None
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
    cover_image_url: Optional[str] = None
    pages: list[PageResponse] = []
    quiz_questions: list[QuizResponse] = []
    created_at: str


@router.post("/analyze-character")
async def analyze_character(req: AnalyzeCharacterRequest):
    """Use OpenRouter to identify character + Nano Banana 2 to generate a portrait."""
    import json
    import uuid
    import base64
    import httpx
    from pathlib import Path
    from app.config import settings

    STATIC_DIR = Path("static/images")
    OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
    OR_HEADERS = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://readquest.app",
        "X-Title": "ReadQuest",
    }

    # ── Task 1: OpenRouter text — character analysis ──────────────────────────
    async def analyze():
        prompt = f"""You are a creative children's story assistant.

The child said their favorite character is: "{req.character}"

Analyze this character and respond ONLY with valid JSON in this exact format:
{{
  "character_name": "official name of the character",
  "universe": "which franchise/universe (e.g. Marvel, Disney, Pixar, etc.)",
  "description": "1-sentence kid-friendly description",
  "image_prompt": "A vibrant full-body portrait illustration of [character name], [brief visual description matching the character's look], white background, clean edges, Disney/Pixar style, bright colors, high detail, no text"
}}"""
        payload = {
            "model": "google/gemini-2.0-flash-001",
            "temperature": 0.7,
            "messages": [{"role": "user", "content": f"You are a creative children's assistant. Reply with valid JSON only.\n\n{prompt}"}],
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(OPENROUTER_URL, json=payload, headers=OR_HEADERS)
            if not resp.is_success:
                print(f"[analyze-character] ERROR {resp.status_code}: {resp.text[:600]}")
                resp.raise_for_status()
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        return json.loads(raw.strip())

    # ── Task 2: Nano Banana 2 character portrait ──────────────────────────────
    async def generate_portrait(image_prompt: str) -> Optional[str]:
        if not settings.OPENROUTER_API_KEY:
            return None
        STATIC_DIR.mkdir(parents=True, exist_ok=True)
        payload = {
            "model": "google/gemini-3.1-flash-image-preview",
            "messages": [{"role": "user", "content": image_prompt}],
            "modalities": ["image", "text"],
        }
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(OPENROUTER_URL, json=payload, headers=OR_HEADERS)
                resp.raise_for_status()
                data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            if isinstance(content, list):
                for part in content:
                    if isinstance(part, dict) and part.get("type") == "image_url":
                        url = part["image_url"]["url"]
                        if url.startswith("data:image"):
                            _, b64 = url.split(",", 1)
                            filename = f"char_{uuid.uuid4().hex}.png"
                            (STATIC_DIR / filename).write_bytes(base64.b64decode(b64))
                            return f"/static/images/{filename}"
            elif isinstance(content, str) and "data:image" in content:
                start = content.find("data:image")
                parts = content[start:].split(",", 1)
                if len(parts) == 2:
                    filename = f"char_{uuid.uuid4().hex}.png"
                    (STATIC_DIR / filename).write_bytes(base64.b64decode(parts[1].split('"')[0]))
                    return f"/static/images/{filename}"
        except Exception as e:
            print(f"[Portrait] Failed: {e}")
        return None

    # Run LLM analysis first, then generate portrait with the prompt it provides
    try:
        char_data = await analyze()
    except Exception:
        char_data = {
            "character_name": req.character,
            "universe": "Original",
            "description": f"The amazing {req.character}!",
            "image_prompt": f"A vibrant full-body portrait of {req.character}, white background, Disney cartoon style, bright colors, no text",
        }

    image_prompt = char_data.get(
        "image_prompt",
        f"A vibrant full-body portrait of {char_data['character_name']}, white background, Disney/Pixar cartoon style, bright colors, no text"
    )

    portrait_url = await generate_portrait(image_prompt)

    return {
        "character_name": char_data.get("character_name", req.character),
        "universe": char_data.get("universe", "Original"),
        "description": char_data.get("description", f"The amazing {req.character}!"),
        "character_image_url": portrait_url,
        "scenes": [],
    }


@router.post("/generate")
async def generate_story(
    req: GenerateRequest,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session)
):
    """Generate an AI story → save to DB → return full story."""
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

    # Persist story
    story = Story(
        student_id=x_student_id,
        title=story_data["title"],
        grade_level=req.grade,
        theme=req.theme,
        cover_image_url=story_data.get("cover_image_url"),
    )
    db.add(story)
    await db.flush()

    pages = []
    for p in story_data["pages"]:
        page = StoryPage(
            story_id=story.id,
            page_number=p["page_number"],
            content=p["content"],
            image_url=p.get("image_url"),
            word_count=len(p["content"].split()),
        )
        db.add(page)
        pages.append(page)

    await db.flush()

    quiz_questions = []
    for q in story_data.get("quiz_questions", []):
        qq = QuizQuestion(
            story_page_id=q["story_page_id"],
            question=q["question"],
            choices=q["choices"],
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation"),
        )
        db.add(qq)
        quiz_questions.append(qq)

    await db.commit()
    await db.refresh(story)

    return {
        "id": story.id,
        "student_id": story.student_id,
        "title": story.title,
        "grade_level": story.grade_level,
        "theme": story.theme,
        "cover_image_url": story.cover_image_url,
        "pages": [{"id": p.id, "story_id": p.story_id, "page_number": p.page_number, "content": p.content, "image_url": p.image_url, "word_count": p.word_count} for p in pages],
        "quiz_questions": [{"id": q.id, "story_page_id": q.story_page_id, "question": q.question, "choices": q.choices, "correct_answer": q.correct_answer, "explanation": q.explanation} for q in quiz_questions],
        "created_at": str(story.created_at),
    }


@router.get("")
async def list_stories(x_student_id: str = Header(...), db: AsyncSession = Depends(get_session)):
    result = await db.execute(select(Story).where(Story.student_id == x_student_id))
    stories = result.scalars().all()
    return [{"id": s.id, "title": s.title, "theme": s.theme, "grade_level": s.grade_level, "cover_image_url": s.cover_image_url, "created_at": str(s.created_at)} for s in stories]


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
        "cover_image_url": story.cover_image_url,
        "pages": [{"id": p.id, "story_id": p.story_id, "page_number": p.page_number, "content": p.content, "image_url": p.image_url, "word_count": p.word_count} for p in sorted(pages, key=lambda x: x.page_number)],
        "quiz_questions": [{"id": q.id, "story_page_id": q.story_page_id, "question": q.question, "choices": q.choices, "correct_answer": q.correct_answer, "explanation": q.explanation} for q in quiz_questions],
        "created_at": str(story.created_at),
    }


@router.post("/{story_id}/pages/{page_number}/read")
async def mark_page_read(
    story_id: str,
    page_number: int,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session)
):
    await award_xp(db, x_student_id, 5, "page_read")
    return {"xp_awarded": 5}


@router.post("/{story_id}/complete")
async def mark_story_complete(
    story_id: str,
    x_student_id: str = Header(...),
    db: AsyncSession = Depends(get_session)
):
    await award_xp(db, x_student_id, 50, "book_complete")
    return {"xp_awarded": 50}
