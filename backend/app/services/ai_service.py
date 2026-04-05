"""
AI Service Bridge — connects LangGraph agents to API routes
"""
from app.agents.content_agent import run_content_agent, run_content_agent_phase1, run_content_agent_phase2
from typing import Optional


async def generate_story_with_ai(
    grade: int,
    theme: str,
    character_name: str,
    language: str = "english",
    art_style: str = "cartoon",
    character_description: Optional[str] = None,
    character_universe: Optional[str] = None,
    character_image_url: Optional[str] = None,
) -> dict:
    """
    Generate a complete story with pages, quizzes, and image prompts.
    Returns a dict matching the story create schema.
    """
    result = await run_content_agent(
        grade=grade,
        theme=theme,
        character_name=character_name,
        language=language,
        art_style=art_style,
        character_description=character_description,
        character_universe=character_universe,
        character_image_url=character_image_url,
    )
    return result


async def generate_story_phase1(
    grade: int,
    theme: str,
    character_name: str,
    language: str = "english",
    art_style: str = "cartoon",
    character_description: Optional[str] = None,
    character_universe: Optional[str] = None,
    character_image_url: Optional[str] = None,
) -> dict:
    """
    Phase 1 — FAST: generate story text + cover image only (~20-25s).
    Page images are NOT generated here — use generate_page_images_background() for that.
    Returns: { title, cover_image_url, pages (text only), quiz_questions }
    """
    return await run_content_agent_phase1(
        grade=grade,
        theme=theme,
        character_name=character_name,
        language=language,
        art_style=art_style,
        character_description=character_description,
        character_universe=character_universe,
        character_image_url=character_image_url,
    )


async def generate_page_images_background(
    story_id: str,
    pages: list,          # list of { page_number, content, page_id }
    character_visual: str,
    character_image_url: Optional[str],
    art_style: str,
    theme: str,
) -> None:
    """
    Phase 2 — runs as a FastAPI BackgroundTask.
    Generates all page images in parallel, updates each StoryPage.media_url as it completes.
    """
    await run_content_agent_phase2(
        story_id=story_id,
        pages=pages,
        character_visual=character_visual,
        character_image_url=character_image_url,
        art_style=art_style,
        theme=theme,
    )
