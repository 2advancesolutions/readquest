"""
SEL Agent — LangGraph agent for Social-Emotional Learning.
Tags stories with SEL themes, generates age-appropriate reflection questions,
and creates Socratic hint trees for guided discovery learning.
"""
import json
import asyncio
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, START, END
from app.config import settings

GEMINI_TEXT_MODEL = "gemini-2.5-flash"

SEL_THEMES = [
    "bullying", "empathy", "kindness", "friendship", "conflict_resolution",
    "self_regulation", "perseverance", "courage", "fairness", "inclusion",
    "gratitude", "responsibility", "honesty", "teamwork", "growth_mindset",
]


class SELState(TypedDict):
    story_text: str
    story_title: str
    grade_level: int
    # Requested SEL theme (optional — if None, auto-detected)
    requested_theme: Optional[str]
    # Computed
    detected_tags: list           # list of SEL theme strings
    reflection_prompts: list      # [{question, hint_1, hint_2, hint_3}]
    character_guide: str          # A short in-character guide message for after the story


async def _call_gemini(prompt: str, temperature: float = 0.6) -> str:
    from google import genai as _genai
    from google.genai import types as _gtypes
    client = _genai.Client(api_key=settings.GEMINI_API_KEY)
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=GEMINI_TEXT_MODEL,
        contents=prompt,
        config=_gtypes.GenerateContentConfig(temperature=temperature, response_modalities=["TEXT"]),
    )
    return response.candidates[0].content.parts[0].text.strip()


async def tag_sel_themes_node(state: SELState) -> SELState:
    """Detect SEL themes present in the story."""
    if state["requested_theme"]:
        state["detected_tags"] = [state["requested_theme"]]
        return state

    prompt = f"""Read this children's story and identify which Social-Emotional Learning (SEL) themes are present.

Story: {state['story_text'][:2000]}

Available SEL themes: {', '.join(SEL_THEMES)}

Output ONLY a valid JSON array of theme strings (1-3 themes max) that are clearly present in the story.
Example: ["bullying", "empathy"]"""

    try:
        raw = await _call_gemini(prompt)
        import re
        arr = re.search(r'\[.*?\]', raw, re.DOTALL)
        if arr:
            tags = json.loads(arr.group(0))
            state["detected_tags"] = [t for t in tags if t in SEL_THEMES]
        else:
            state["detected_tags"] = []
    except Exception as e:
        print(f"[SELAgent] Theme detection failed: {e}")
        state["detected_tags"] = []
    return state


async def generate_reflection_node(state: SELState) -> SELState:
    """
    Generate 3 reflection questions with Socratic hint ladders.
    Each question has 3 progressive hints (rephrase → clue → narrow).
    """
    themes = state["detected_tags"] or ["kindness"]
    grade = state["grade_level"]

    prompt = f"""You are a compassionate elementary school counselor creating a reading reflection for Grade {grade} students.

Story title: "{state['story_title']}"
SEL themes in this story: {', '.join(themes)}

Create exactly 3 reflective discussion questions about this story's SEL themes.
For each question, also write 3 Socratic hints that progressively guide the child to the answer
WITHOUT giving it away directly. Hints should go from broad → specific → nearly there.

Make everything warm, age-appropriate, and encouraging for Grade {grade}.

Output ONLY valid JSON:
[
  {{
    "question": "How do you think [character] felt when [situation]?",
    "hint_1": "Think about a time when YOU felt that way. What was happening?",
    "hint_2": "Look at the part in the story where [character] [action]. How did their face look?",
    "hint_3": "Was the character feeling happy, sad, scared, or angry? Which one fits best here?"
  }}
]"""

    try:
        raw = await _call_gemini(prompt)
        import re
        fence = re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', raw)
        if fence:
            raw = fence.group(1)
        json_arr = re.search(r'\[[\s\S]+\]', raw)
        if json_arr:
            state["reflection_prompts"] = json.loads(json_arr.group(0))
        else:
            state["reflection_prompts"] = json.loads(raw.strip())
    except Exception as e:
        print(f"[SELAgent] Reflection generation failed: {e}")
        state["reflection_prompts"] = [
            {
                "question": "What did you learn from this story?",
                "hint_1": "Think about what the main character did.",
                "hint_2": "Did the character make a good choice or a not-so-good choice?",
                "hint_3": "What would YOU do in that situation?",
            }
        ]
    return state


async def generate_character_guide_node(state: SELState) -> SELState:
    """Generate a short closing message from the AI tutor character after the SEL story."""
    themes = state["detected_tags"] or ["kindness"]
    grade = state["grade_level"]

    prompt = f"""Write a SHORT (2-3 sentence) warm, encouraging closing message for a Grade {grade} child 
who just finished reading a story about {', '.join(themes)}.
Speak as a friendly AI reading guide named "Sage the Owl 🦉".
Ask them to think about one way they can show {themes[0]} in real life today.
Output ONLY the message text."""

    try:
        state["character_guide"] = await _call_gemini(prompt, temperature=0.8)
    except Exception:
        state["character_guide"] = (
            f"Wonderful reading! 🦉 Think about what {themes[0]} means to you. "
            "How can you show it to someone today? You're awesome!"
        )
    return state


def build_sel_graph():
    builder = StateGraph(SELState)
    builder.add_node("tag_themes", tag_sel_themes_node)
    builder.add_node("gen_reflections", generate_reflection_node)
    builder.add_node("gen_guide", generate_character_guide_node)

    builder.add_edge(START, "tag_themes")
    builder.add_edge("tag_themes", "gen_reflections")
    builder.add_edge("gen_reflections", "gen_guide")
    builder.add_edge("gen_guide", END)

    return builder.compile()


sel_graph = build_sel_graph()


async def run_sel_agent(
    story_text: str,
    story_title: str,
    grade_level: int,
    requested_theme: Optional[str] = None,
) -> dict:
    """Entry point — tag SEL themes and generate reflection questions + Socratic hints."""
    initial: SELState = {
        "story_text": story_text,
        "story_title": story_title,
        "grade_level": grade_level,
        "requested_theme": requested_theme,
        "detected_tags": [],
        "reflection_prompts": [],
        "character_guide": "",
    }
    final = await sel_graph.ainvoke(initial)
    return {
        "sel_tags": final["detected_tags"],
        "reflection_prompts": final["reflection_prompts"],
        "character_guide": final["character_guide"],
    }
