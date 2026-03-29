"""
AI Service Bridge — connects LangGraph agents to API routes
"""
from app.agents.content_agent import run_content_agent
from typing import Optional


async def generate_story_with_ai(
    grade: int,
    theme: str,
    character_name: str,
    language: str = "english",
    art_style: str = "cartoon",
    character_description: Optional[str] = None,
    character_universe: Optional[str] = None,
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
    )
    return result
