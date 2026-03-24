"""
m1 & m2 — LangGraph Content Generation Agent
Generates grade-appropriate stories, image prompts, and quiz questions
"""
import json
import asyncio
import uuid
import base64
from pathlib import Path
from typing import TypedDict, Optional
import httpx
from langgraph.graph import StateGraph, START, END
from app.config import settings

STATIC_DIR = Path("static/images")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_IMAGE_MODEL = "google/gemini-3.1-flash-image-preview"
OPENROUTER_TEXT_MODEL  = "google/gemini-2.0-flash-001"

# ── State Schema ────────────────────────────────────────────────────────────
class ContentState(TypedDict):
    grade: int
    theme: str
    character_name: str
    grade_vocab_desc: str
    story_raw: str
    story_parsed: dict
    image_prompts: list
    image_urls: list        # actual Imagen 2 generated image URLs
    quiz_questions: list
    quality_score: float
    retry_count: int
    result: dict


# ── Grade level vocabulary descriptions ─────────────────────────────────────
GRADE_VOCAB = {
    0: "Kindergarten: very simple 3-5 word sentences, sight words only, short words (cat, dog, red, big, run)",
    1: "1st Grade: 5-8 word sentences, simple CVC words, basic sight words (the, and, is, it, he, she)",
    2: "2nd Grade: 8-12 word sentences, two-syllable words common, compound sentences OK",
    3: "3rd Grade: 10-14 word sentences, descriptive adjectives, basic figurative language, some multisyllabic words",
    4: "4th Grade: 12-16 word sentences, metaphors and similes, varied sentence structure, topic-specific vocabulary",
    5: "5th Grade: 14-18 word sentences, complex vocabulary, clear themes and motifs, nuanced characters",
    6: "6th Grade: 15-20 word sentences, abstract concepts, foreshadowing, subplots, varied narrative perspective",
    7: "7th Grade: 16-22 word sentences, sophisticated vocabulary, complex plot, irony and symbolism",
    8: "8th Grade: 18-25 word sentences, advanced literary devices, multi-layered themes, mature vocabulary",
}


async def _call_openrouter_text(system: str, user: str, temperature: float = 0.8) -> str:
    """Call OpenRouter for text/JSON generation using google/gemini-2.0-flash."""
    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://readquest.app",
        "X-Title": "ReadQuest",
    }
    # Combine into one user message — most compatible across all OpenRouter models
    combined = f"{system}\n\n{user}" if system else user
    payload = {
        "model": OPENROUTER_TEXT_MODEL,
        "temperature": temperature,
        "messages": [{"role": "user", "content": combined}],
    }
    print(f"[OpenRouter text] model={OPENROUTER_TEXT_MODEL}, len={len(combined)}")
    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)
        if not resp.is_success:
            print(f"[OpenRouter text] ERROR {resp.status_code}: {resp.text[:800]}")
            resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()



# ── Nodes ────────────────────────────────────────────────────────────────────

async def grade_setup_node(state: ContentState) -> ContentState:
    """Enrich state with grade-level vocabulary guidance."""
    state["grade_vocab_desc"] = GRADE_VOCAB.get(state["grade"], GRADE_VOCAB[3])
    state["retry_count"] = 0
    return state


async def story_writer_node(state: ContentState) -> ContentState:
    """Generate the story text with proper grade-level vocabulary via OpenRouter."""
    prompt = f"""You are a brilliant children's book author writing for a {state['grade']}-grade reading level.

Grade Level Writing Guide: {state['grade_vocab_desc']}

Theme / Setting: {state['theme']}
Main Character: {state['character_name']}

Write a complete, engaging children's story with EXACTLY 5 pages. Each page should have about 50-70 words.

Output ONLY valid JSON in this exact format:
{{
  "title": "Story title here",
  "pages": [
    {{"page_number": 1, "content": "Page 1 text here..."}},
    {{"page_number": 2, "content": "Page 2 text here..."}},
    {{"page_number": 3, "content": "Page 3 text here..."}},
    {{"page_number": 4, "content": "Page 4 text here..."}},
    {{"page_number": 5, "content": "Page 5 text here..."}}
  ]
}}

Guidelines:
- Page 1: Introduce {state['character_name']} and the setting
- Pages 2-4: Build the adventure and conflict
- Page 5: Resolution and a positive lesson
- Make it fun, exciting, and suitable for the reading level
- NO quotation marks inside the page text that would break JSON
"""
    raw = await _call_openrouter_text(
        system="You are a creative children's book author. Always respond with valid JSON only.",
        user=prompt,
    )
    state["story_raw"] = raw
    return state


async def parse_story_node(state: ContentState) -> ContentState:
    """Parse and validate the story JSON."""
    raw = state["story_raw"]
    # Strip markdown code fences if present
    if "```" in raw:
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        parsed = json.loads(raw.strip())
        state["story_parsed"] = parsed
        state["quality_score"] = 0.8  # basic pass
    except Exception:
        state["story_parsed"] = {
            "title": f"{state['character_name']}'s Big Adventure",
            "pages": [{"page_number": i, "content": f"Page {i} content..."} for i in range(1, 6)],
        }
        state["quality_score"] = 0.3
    return state


async def _generate_image_openrouter(prompt: str) -> Optional[str]:
    """Call Nano Banana 2 (gemini-3.1-flash-image-preview) via OpenRouter.
    Returns the saved /static/images/<file>.png path, or None on failure."""
    api_key = settings.OPENROUTER_API_KEY
    if not api_key:
        print("[OpenRouter] No OPENROUTER_API_KEY set — skipping image generation")
        return None

    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    payload = {
        "model": OPENROUTER_IMAGE_MODEL,
        "messages": [
            {
                "role": "user",
                "content": (
                    f"Create a beautiful children's book illustration for this scene. "
                    f"Pixar-style 3D cartoon, bright vibrant colors, wholesome and cheerful, "
                    f"safe for kids, no text overlaid on the image. "
                    f"Scene: {prompt}"
                ),
            }
        ],
        "modalities": ["image", "text"],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://readquest.app",
        "X-Title": "ReadQuest",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(OPENROUTER_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        # Extract image from response
        choices = data.get("choices", [])
        if not choices:
            print(f"[OpenRouter] No choices in response: {data}")
            return None

        content = choices[0].get("message", {}).get("content", "")

        # Content can be a list of parts or a string
        if isinstance(content, list):
            for part in content:
                if isinstance(part, dict) and part.get("type") == "image_url":
                    url = part["image_url"]["url"]
                    if url.startswith("data:image"):
                        # Extract base64 data
                        header, b64data = url.split(",", 1)
                        img_bytes = base64.b64decode(b64data)
                        filename = f"{uuid.uuid4().hex}.png"
                        (STATIC_DIR / filename).write_bytes(img_bytes)
                        return f"/static/images/{filename}"
        elif isinstance(content, str) and "data:image" in content:
            # Sometimes returned as inline data URL in text
            start = content.find("data:image")
            b64part = content[start:].split('"')[0].split(',', 1)
            if len(b64part) == 2:
                img_bytes = base64.b64decode(b64part[1])
                filename = f"{uuid.uuid4().hex}.png"
                (STATIC_DIR / filename).write_bytes(img_bytes)
                return f"/static/images/{filename}"

        print(f"[OpenRouter] No image found in response content: {str(content)[:200]}")
        return None

    except Exception as e:
        print(f"[OpenRouter] Image generation failed: {e}")
        return None


async def image_prompt_node(state: ContentState) -> ContentState:
    """Generate illustration prompts and call Nano Banana 2 via OpenRouter for each page."""
    pages = state["story_parsed"].get("pages", [])
    prompts = []
    for page in pages:
        prompt = (
            f"{page['content'][:200]}. "
            f"Theme: {state['theme']}. Character: {state['character_name']}. "
            f"Grade {state['grade']} children's story illustration."
        )
        prompts.append(prompt)
    state["image_prompts"] = prompts

    # Generate all 5 page images concurrently
    tasks = [_generate_image_openrouter(p) for p in prompts]
    image_urls = list(await asyncio.gather(*tasks))
    state["image_urls"] = image_urls
    return state


async def quiz_generator_node(state: ContentState) -> ContentState:
    """Generate comprehension quiz questions for the story via OpenRouter."""
    pages = state["story_parsed"].get("pages", [])
    title = state["story_parsed"].get("title", "the story")
    story_text = "\n".join([f"Page {p['page_number']}: {p['content']}" for p in pages])

    prompt = f"""Read this children's story and create 3 comprehension quiz questions.

Story Title: {title}
Story Text:
{story_text}

Create exactly 3 multiple-choice questions. Make them fun and age-appropriate for grade {state['grade']}.

Output ONLY valid JSON:
[
  {{
    "page_index": 1,
    "question": "Question text?",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct_answer": "Choice B",
    "explanation": "Brief kid-friendly explanation"
  }}
]
"""
    try:
        raw = await _call_openrouter_text(system="You generate quiz questions. Respond with valid JSON only.", user=prompt)
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        state["quiz_questions"] = json.loads(raw.strip())
    except Exception:
        state["quiz_questions"] = []
    return state


async def assemble_result_node(state: ContentState) -> ContentState:
    """Assemble the final story result object."""
    pages = state["story_parsed"].get("pages", [])
    quiz_raw = state.get("quiz_questions", [])

    # Map quiz questions to page IDs (will be resolved with actual DB IDs post-insert)
    quiz_questions = []
    for i, q in enumerate(quiz_raw):
        page_idx = q.get("page_index", min(i * 2 + 1, len(pages))) - 1
        quiz_questions.append({
            "story_page_id": f"__page_{page_idx}__",  # resolved after DB insert
            "question": q.get("question", ""),
            "choices": q.get("choices", []),
            "correct_answer": q.get("correct_answer", ""),
            "explanation": q.get("explanation", ""),
        })

    state["result"] = {
        "title": state["story_parsed"].get("title", f"{state['character_name']}'s Adventure"),
        "cover_image_url": state["image_urls"][0] if state.get("image_urls") else None,
        "pages": [
            {
                "page_number": p["page_number"],
                "content": p["content"],
                "image_url": state["image_urls"][i] if i < len(state.get("image_urls", [])) else None,
                "image_prompt": state["image_prompts"][i] if i < len(state["image_prompts"]) else "",
            }
            for i, p in enumerate(pages)
        ],
        "quiz_questions": quiz_questions,
    }
    return state


# ── Build Graph ──────────────────────────────────────────────────────────────

def build_content_graph():
    builder = StateGraph(ContentState)

    builder.add_node("grade_setup", grade_setup_node)
    builder.add_node("story_writer", story_writer_node)
    builder.add_node("parse_story", parse_story_node)
    builder.add_node("image_prompt_gen", image_prompt_node)
    builder.add_node("quiz_generator", quiz_generator_node)
    builder.add_node("assemble_result", assemble_result_node)

    builder.add_edge(START, "grade_setup")
    builder.add_edge("grade_setup", "story_writer")
    builder.add_edge("story_writer", "parse_story")
    builder.add_edge("parse_story", "image_prompt_gen")
    builder.add_edge("image_prompt_gen", "quiz_generator")
    builder.add_edge("quiz_generator", "assemble_result")
    builder.add_edge("assemble_result", END)

    return builder.compile()


content_graph = build_content_graph()


async def run_content_agent(grade: int, theme: str, character_name: str) -> dict:
    """Entry point — run the content generation graph."""
    initial_state: ContentState = {
        "grade": grade,
        "theme": theme,
        "character_name": character_name,
        "grade_vocab_desc": "",
        "story_raw": "",
        "story_parsed": {},
        "image_prompts": [],
        "image_urls": [],
        "quiz_questions": [],
        "quality_score": 0.0,
        "retry_count": 0,
        "result": {},
    }

    final_state = await content_graph.ainvoke(initial_state)
    return final_state["result"]
