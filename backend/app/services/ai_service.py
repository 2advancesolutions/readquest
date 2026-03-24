"""
AI Service Bridge — connects LangGraph agents to API routes
"""
from app.agents.content_agent import run_content_agent


async def generate_story_with_ai(grade: int, theme: str, character_name: str, language: str = "english", art_style: str = "cartoon") -> dict:
    """
    Generate a complete story with pages, quizzes, and image prompts.
    Returns a dict matching the story create schema.
    """
    result = await run_content_agent(
        grade=grade,
        theme=theme,
        character_name=character_name,
    )
    return result
