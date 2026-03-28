"""
Vocabulary router — Tier 2 academic word extraction and student word bank.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_session
from app.models.vocabulary import VocabularyWord
from app.models.story import Story, StoryPage
from app.agents.vocabulary_agent import run_vocabulary_agent

router = APIRouter()


class SaveWordRequest(BaseModel):
    word: str


@router.post("/extract/{story_id}")
async def extract_vocabulary(
    story_id: str,
    x_student_id: Optional[str] = Header(default=None),
    db: AsyncSession = Depends(get_session),
):
    """
    Extract Tier 2 vocabulary words from a story and save to vocabulary_bank.
    Idempotent — skips words already saved for this student+story.
    """
    if not x_student_id:
        raise HTTPException(400, "x-student-id header required")

    # Fetch the story and its pages
    story_r = await db.execute(select(Story).where(Story.id == story_id))
    story = story_r.scalar_one_or_none()
    if not story:
        raise HTTPException(404, "Story not found")

    pages_r = await db.execute(
        select(StoryPage)
        .where(StoryPage.story_id == story_id)
        .order_by(StoryPage.page_number)
    )
    pages = pages_r.scalars().all()
    story_text = "\n".join(p.content for p in pages)

    # Run vocabulary agent
    words = await run_vocabulary_agent(
        story_text=story_text,
        story_id=story_id,
        student_id=x_student_id,
        grade_level=story.grade_level,
    )

    # Save to DB (skip duplicates)
    saved_count = 0
    for w in words:
        existing = await db.execute(
            select(VocabularyWord)
            .where(VocabularyWord.word == w["word"])
            .where(VocabularyWord.student_id == x_student_id)
            .where(VocabularyWord.story_id == story_id)
        )
        if not existing.scalar_one_or_none():
            db.add(VocabularyWord(
                word=w["word"],
                definition=w["definition"],
                example_sentence=w["example_sentence"],
                pronunciation_url=w.get("pronunciation_url"),
                grade_level=story.grade_level,
                story_id=story_id,
                student_id=x_student_id,
                is_saved=False,
            ))
            saved_count += 1

    await db.commit()
    return {"extracted": len(words), "saved_new": saved_count, "words": words}


@router.get("/words/{student_id}")
async def get_vocabulary_bank(
    student_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Get all vocabulary words in a student's personal word bank."""
    result = await db.execute(
        select(VocabularyWord)
        .where(VocabularyWord.student_id == student_id)
        .order_by(VocabularyWord.word)
    )
    words = result.scalars().all()
    return [
        {
            "id": w.id,
            "word": w.word,
            "definition": w.definition,
            "example_sentence": w.example_sentence,
            "pronunciation_url": w.pronunciation_url,
            "grade_level": w.grade_level,
            "story_id": w.story_id,
            "is_saved": w.is_saved,
        }
        for w in words
    ]


@router.post("/words/{word_id}/save")
async def save_word(
    word_id: str,
    db: AsyncSession = Depends(get_session),
):
    """Mark a word as saved to the student's personal bank (like 'Add to my words')."""
    result = await db.execute(select(VocabularyWord).where(VocabularyWord.id == word_id))
    word = result.scalar_one_or_none()
    if not word:
        raise HTTPException(404, "Word not found")
    word.is_saved = True
    await db.commit()
    return {"saved": True, "word": word.word}


@router.get("/pronounce/{word}")
async def pronounce_word(word: str):
    """Get TTS pronunciation URL for a vocabulary word via the existing TTS pipeline."""
    from app.routers.tts import _chirp3_tts_sync, _gemini_tts_sync
    import asyncio
    import base64

    loop = asyncio.get_running_loop()
    try:
        audio_bytes = await loop.run_in_executor(None, _chirp3_tts_sync, word, "word")
        audio_b64 = base64.b64encode(audio_bytes).decode()
        return {"word": word, "audio_base64": audio_b64, "mime_type": "audio/mpeg"}
    except Exception:
        try:
            audio_bytes = await loop.run_in_executor(None, _gemini_tts_sync, word, "word")
            audio_b64 = base64.b64encode(audio_bytes).decode()
            return {"word": word, "audio_base64": audio_b64, "mime_type": "audio/wav"}
        except Exception as e:
            raise HTTPException(500, f"TTS failed: {e}")
