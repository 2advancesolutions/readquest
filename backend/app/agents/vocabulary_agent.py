"""
Vocabulary Agent — LangGraph agent for Tier 2 academic vocabulary extraction.
Identifies "smart words" kids see on tests but not in daily conversation,
then generates kid-friendly definitions and example sentences.
"""
import json
import asyncio
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from app.config import settings

GEMINI_TEXT_MODEL = "gemini-2.5-flash"


class VocabularyState(TypedDict):
    story_text: str
    story_id: str
    student_id: str
    grade_level: int
    # Computed
    tier2_words: list   # [{word, definition, example_sentence}]
    enriched_words: list  # After adding pronunciation URLs


async def _call_gemini(prompt: str, temperature: float = 0.5) -> str:
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


async def extract_tier2_node(state: VocabularyState) -> VocabularyState:
    """
    Use Gemini to identify Tier 2 vocabulary:
    - Academic words that appear on standardized tests
    - NOT Tier 1 (everyday: cat, run, happy) or Tier 3 (domain-specific jargon)
    - Example Tier 2 words: 'reluctant', 'analyze', 'consequence', 'persevere'
    """
    prompt = f"""You are an expert reading educator working with Grade {state['grade_level']} students.

Read this story text and identify 5-8 Tier 2 vocabulary words. 
Tier 2 words are ACADEMIC words that:
- Appear frequently in school reading and tests
- Are NOT everyday casual words (Tier 1: cat, big, happy)
- Are NOT highly technical domain words (Tier 3: photosynthesis, algorithm)
- Examples: reluctant, analyze, consequence, persevere, infer, significant, determine

Story text:
{state['story_text'][:3000]}

For each Tier 2 word found, write a kid-friendly definition (1 simple sentence) and 
an example sentence using natural context. If fewer than 5 Tier 2 words exist, 
supplement with related Tier 2 words a Grade {state['grade_level']} student should know.

Output ONLY valid JSON array:
[
  {{
    "word": "reluctant",
    "definition": "When you really don't want to do something, even if you know you should.",
    "example_sentence": "Maya was reluctant to go to bed even though she was tired."
  }}
]"""

    try:
        raw = await _call_gemini(prompt)
        # Strip markdown fences if present
        import re
        fence = re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', raw)
        if fence:
            raw = fence.group(1)
        state["tier2_words"] = json.loads(raw.strip())
    except Exception as e:
        print(f"[VocabularyAgent] Tier 2 extraction failed: {e}")
        state["tier2_words"] = []
    return state


async def enrich_words_node(state: VocabularyState) -> VocabularyState:
    """
    Enrich words with pronunciation URLs via the existing TTS pipeline.
    Pronunciation is fetched lazily — failures don't block.
    """
    from app.routers.tts import _synthesize_text  # reuse existing TTS helper

    enriched = []
    for item in state["tier2_words"]:
        pronunciation_url = None
        try:
            pronunciation_url = await _synthesize_text(item["word"])
        except Exception:
            pass  # Pronunciation is a nice-to-have
        enriched.append({**item, "pronunciation_url": pronunciation_url})

    state["enriched_words"] = enriched
    return state


def build_vocabulary_graph():
    builder = StateGraph(VocabularyState)
    builder.add_node("extract_tier2", extract_tier2_node)
    builder.add_node("enrich_words", enrich_words_node)

    builder.add_edge(START, "extract_tier2")
    builder.add_edge("extract_tier2", "enrich_words")
    builder.add_edge("enrich_words", END)

    return builder.compile()


vocabulary_graph = build_vocabulary_graph()


async def run_vocabulary_agent(
    story_text: str,
    story_id: str,
    student_id: str,
    grade_level: int,
) -> list[dict]:
    """Entry point — extract and enrich Tier 2 vocabulary from story text."""
    initial: VocabularyState = {
        "story_text": story_text,
        "story_id": story_id,
        "student_id": student_id,
        "grade_level": grade_level,
        "tier2_words": [],
        "enriched_words": [],
    }
    final = await vocabulary_graph.ainvoke(initial)
    return final["enriched_words"]
