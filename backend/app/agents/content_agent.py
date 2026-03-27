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
GEMINI_TEXT_MODEL = "gemini-2.5-flash"  # direct SDK — gemini-2.0-flash deprecated

# ── Supabase Storage config ──────────────────────────────────────────────────
SUPABASE_URL     = "https://nspehtlzknfbiwvjswge.supabase.co"
SUPABASE_BUCKET  = "story-images"
# Service-role key is needed for Storage uploads (more permissive than anon key)
# Falls back to env var SUPABASE_SERVICE_KEY if set, else uses anon key
SUPABASE_SERVICE_KEY = getattr(settings, "SUPABASE_SERVICE_KEY", "") or getattr(settings, "SUPABASE_ANON_KEY", "")


async def _upload_to_supabase(img_bytes: bytes, filename: str) -> Optional[str]:
    """
    Upload image bytes to Supabase Storage 'story-images' bucket.
    Returns the permanent public URL, or None on failure.
    """
    if not SUPABASE_SERVICE_KEY:
        return None

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "image/png",
        "x-upsert": "true",   # overwrite if exists
    }

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(upload_url, content=img_bytes, headers=headers)
            if resp.status_code in (200, 201):
                public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{filename}"
                print(f"[Supabase Storage] Uploaded: {public_url}")
                return public_url
            else:
                print(f"[Supabase Storage] Upload failed: {resp.status_code} {resp.text[:200]}")
                return None
    except Exception as e:
        print(f"[Supabase Storage] Upload error: {e}")
        return None




# ── State Schema ────────────────────────────────────────────────────────────
class ContentState(TypedDict):
    grade: int
    theme: str
    character_name: str
    language: str
    art_style: str
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
    0: (
        "Kindergarten: Max 3-5 words per sentence. ONLY the most common sight words: "
        "I, a, the, is, it, in, on, at, go, do, to, see, me, my, can, big, red, cat, dog, sun, mom, dad. "
        "Story pages: 25-35 words each. No word over 4 letters. Zero adjectives beyond size/color."
    ),
    1: (
        "1st Grade: Max 5-7 words per sentence. Use ONLY 1-2 syllable words; avoid 3-syllable words entirely. "
        "Allowed vocabulary: Dolch sight words (the, and, is, it, he, she, we, you, I, was, said, for, "
        "are, but, not, from, had, him, his, how, her, if, did, get, has, its, let, man, old, put, sat, set). "
        "Story pages: 40-55 words each. Simple subject-verb-object sentences only. "
        "NO words like: magical, created, adventure, discovered, beautiful, enormous, frightened, breathtaking. "
        "YES words like: happy, sad, big, small, run, jump, play, funny, round, fast, soft, kind."
    ),
    2: (
        "2nd Grade: Max 8-12 words per sentence. Two-syllable words are fine; limit 3-syllable words. "
        "Compound sentences with 'and', 'but', 'so' are OK. "
        "Story pages: 55-75 words each. Simple emotions and motivations shown clearly."
    ),
    3: (
        "3rd Grade: 10-14 words per sentence. Descriptive adjectives and adverbs welcome. "
        "Some 3-syllable words OK. Light figurative language (she ran like the wind). "
        "Story pages: 70-90 words each."
    ),
    4: (
        "4th Grade: 12-16 words per sentence. Metaphors, similes, varied sentence structure. "
        "Topic-specific vocabulary with context clues. Story pages: 80-100 words each."
    ),
    5: (
        "5th Grade: 14-18 words per sentence. Complex vocabulary, clear themes and motifs, "
        "nuanced characters. Story pages: 90-110 words each."
    ),
    6: (
        "6th Grade: 15-20 words per sentence. Abstract concepts, foreshadowing, subplots, "
        "varied narrative perspective. Story pages: 100-120 words each."
    ),
    7: (
        "7th Grade: 16-22 words per sentence. Sophisticated vocabulary, complex plot, "
        "irony and symbolism. Story pages: 110-130 words each."
    ),
    8: (
        "8th Grade: 18-25 words per sentence. Advanced literary devices, multi-layered themes, "
        "mature vocabulary. Story pages: 120-140 words each."
    ),
}


async def _call_gemini_text(system: str, user: str, temperature: float = 0.8) -> str:
    """Call Gemini directly via google-genai SDK for text/JSON generation."""
    from google import genai as _genai
    from google.genai import types as _gtypes

    combined = f"{system}\n\n{user}" if system else user
    print(f"[Gemini text] model={GEMINI_TEXT_MODEL}, len={len(combined)}")
    client = _genai.Client(api_key=settings.GEMINI_API_KEY)
    response = await asyncio.to_thread(
        client.models.generate_content,
        model=GEMINI_TEXT_MODEL,
        contents=combined,
        config=_gtypes.GenerateContentConfig(
            temperature=temperature,
            response_modalities=["TEXT"],
        ),
    )
    return response.candidates[0].content.parts[0].text.strip()



# ── Nodes ────────────────────────────────────────────────────────────────────

async def grade_setup_node(state: ContentState) -> ContentState:
    """Enrich state with grade-level vocabulary guidance."""
    state["grade_vocab_desc"] = GRADE_VOCAB.get(state["grade"], GRADE_VOCAB[3])
    state["retry_count"] = 0
    return state


async def story_writer_node(state: ContentState) -> ContentState:
    """Generate the story text with proper grade-level vocabulary via OpenRouter."""
    char = state['character_name']
    grade = state['grade']
    vocab_desc = state['grade_vocab_desc']

    # Extra enforcement block for the lowest grades
    early_grade_warning = ""
    if grade <= 1:
        early_grade_warning = """
⚠️ GRADE 1 STRICT RULES — MUST FOLLOW:
- EVERY sentence must be 5-7 words or shorter. Count the words. If a sentence is longer, split it.
- NEVER use 3-syllable words (no: beautiful, adventure, magical, rainforest, discovered, wonderful, together).
- Use ONLY these kinds of words: run, play, jump, hop, big, small, fast, slow, happy, sad, kind, fun.
- Each page must be 40-55 words total. Count each page. If over 55 words, shorten it.
- Re-read each page aloud and ask: could a 5-year-old read this? If not, simplify.
"""
    elif grade == 2:
        early_grade_warning = """
⚠️ GRADE 2 RULE: Keep sentences to max 10 words. Avoid words with 3+ syllables unless very common.
Each page must be 55-75 words.
"""

    prompt = f"""You are a brilliant children's book author writing for a Grade {grade} reading level.

Grade Level Writing Guide:
{vocab_desc}

Theme / Setting: {state['theme']}
Main Character: {char}
Language: {state.get('language', 'english')}
{early_grade_warning}
Write a complete, engaging children's story in {state.get('language', 'english')} with EXACTLY 5 pages.

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
- Page 1: Introduce {char} and the setting
- Pages 2-4: Build the adventure and conflict
- Page 5: Resolution and a positive lesson
- Make it fun, exciting, and suitable for the reading level
- NO quotation marks inside the page text that would break JSON

CRITICAL — CHARACTER NAME RULES (MUST FOLLOW):
- Use the character name EXACTLY as given: "{char}"
- Do NOT add a last name, surname, or title (e.g. if given "Dora" write "Dora" NOT "Dora Márquez" or "Dora the Explorer")
- Do NOT translate, expand, or creatively rename the character
- Every reference to the character in the story must use exactly "{char}"
"""
    raw = await _call_gemini_text(
        system="You are a creative children's book author. Always respond with valid JSON only. Follow ALL grade level and character name instructions exactly.",
        user=prompt,
        temperature=0.7,
    )
    state["story_raw"] = raw
    return state


async def parse_story_node(state: ContentState) -> ContentState:
    """Parse and validate the story JSON — robust against Gemini formatting quirks."""
    raw = state["story_raw"]

    def _try_parse(text: str):
        return json.loads(text.strip())

    parsed = None
    last_err = None

    # Strategy 1: raw text directly
    try:
        parsed = _try_parse(raw)
    except Exception as e:
        last_err = e

    # Strategy 2: strip markdown code fences (```json ... ``` or ``` ... ```)
    if parsed is None:
        try:
            import re as _re
            fence_match = _re.search(r'```(?:json)?\s*([\s\S]+?)\s*```', raw)
            if fence_match:
                parsed = _try_parse(fence_match.group(1))
        except Exception as e:
            last_err = e

    # Strategy 3: extract first { ... } block (handles leading Gemini "thinking" text)
    if parsed is None:
        try:
            import re as _re
            json_match = _re.search(r'\{[\s\S]+\}', raw)
            if json_match:
                parsed = _try_parse(json_match.group(0))
        except Exception as e:
            last_err = e

    if parsed and "pages" in parsed and len(parsed["pages"]) > 0:
        state["story_parsed"] = parsed
        state["quality_score"] = 0.8
    else:
        print(f"[parse_story_node] FAILED to parse story JSON. err={last_err}")
        print(f"[parse_story_node] raw (first 500 chars): {raw[:500]}")
        state["story_parsed"] = {
            "title": f"{state['character_name']}'s Big Adventure",
            "pages": [{"page_number": i, "content": f"Page {i} content..."} for i in range(1, 6)],
        }
        state["quality_score"] = 0.3
    return state



async def _generate_image_nano_banana2(prompt: str) -> Optional[str]:
    """Generate a per-page illustration using gemini-2.5-flash-image
    via the google-genai SDK with GEMINI_API_KEY.

    Returns the local /static/images/<uuid>.png path, or None on failure.
    """
    from google import genai as _genai
    from google.genai import types as _gtypes

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        print("[Gemini-Image] No GEMINI_API_KEY — skipping")
        return None

    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    # ── Sanitize the story prompt so it won't trigger safety filters ──────────
    # Remove action/combat/villain words that Gemini's image model blocks
    _BLOCK_WORDS = [
        "fight", "fought", "battle", "attack", "shoot", "shot", "laser", "beam",
        "stomp", "crash", "explosion", "villain", "evil", "robot", "gun", "weapon",
        "steal", "stole", "stolen", "heist", "rob", "crime", "danger", "dark",
        "destroy", "kill", "punch", "kick", "blow up", "blast", "smash", "threat",
        "enemy", "enemies", "spy", "trap", "escape", "chaos", "terror",
    ]
    safe_scene = prompt[:300]
    for w in _BLOCK_WORDS:
        import re as _re
        safe_scene = _re.sub(rf'\b{w}\w*\b', 'adventure', safe_scene, flags=_re.IGNORECASE)

    image_prompt = (
        "Create a beautiful children's book illustration. "
        "Pixar-style 3D cartoon, bright vibrant colors, wholesome, cheerful, "
        "safe for kids, no text. "
        f"Scene: {safe_scene}"
    )

    # Three varied safe fallbacks in case the sanitized prompt still triggers filters
    _SAFE_FALLBACKS = [
        ("A beautiful Pixar-style 3D cartoon children's book illustration. "
         "Colorful futuristic city with friendly round robots, glowing buildings, "
         "rainbow sky, cheerful warm lighting. No text, no people, wholesome and bright."),
        ("A beautiful Pixar-style 3D cartoon illustration. "
         "Magical forest with friendly animals, sparkling fireflies, rainbow, "
         "colorful flowers. Cheerful, bright, safe for children. No text."),
        ("A beautiful Pixar-style 3D cartoon children's book illustration. "
         "Sunny day in a friendly neighborhood. Colorful houses, fluffy clouds, "
         "smiling sun, butterflies. No text, warm and happy."),
    ]

    try:
        client = _genai.Client(api_key=api_key)

        def _call(p: str):
            return client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=p,
                config=_gtypes.GenerateContentConfig(
                    response_modalities=["IMAGE", "TEXT"],
                ),
            )

        def _extract_image(response) -> Optional[bytes]:
            """Return image bytes from response, or None if blocked/missing."""
            if not response.candidates:
                return None
            candidate = response.candidates[0]
            if not candidate.content or not candidate.content.parts:
                reason = getattr(candidate, 'finish_reason', 'unknown')
                print(f"[Gemini-Image] Blocked — finish_reason={reason}")
                return None
            for part in candidate.content.parts:
                if part.inline_data and part.inline_data.data:
                    return part.inline_data.data
            return None

        print(f"[Gemini-Image] Calling gemini-2.5-flash-image...")
        response = await asyncio.to_thread(_call, image_prompt)
        img_bytes = _extract_image(response)

        # Try each fallback until one works
        for i, fallback in enumerate(_SAFE_FALLBACKS):
            if img_bytes is not None:
                break
            print(f"[Gemini-Image] Retrying with safe fallback #{i+1}...")
            response = await asyncio.to_thread(_call, fallback)
            img_bytes = _extract_image(response)

        if img_bytes:
            filename = f"{uuid.uuid4().hex}.png"
            # Try Supabase Storage first (persistent), fall back to local
            public_url = await _upload_to_supabase(img_bytes, filename)
            if public_url:
                return public_url
            # Fallback: local static dir (ephemeral in production, but better than nothing)
            STATIC_DIR.mkdir(parents=True, exist_ok=True)
            (STATIC_DIR / filename).write_bytes(img_bytes)
            print(f"[Gemini-Image] Saved locally (no Supabase key): static/images/{filename} ({len(img_bytes)} bytes)")
            return f"/static/images/{filename}"


        print("[Gemini-Image] Could not generate image after all retries — skipping")
        return None

    except Exception as e:
        err_str = str(e)
        if "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            print(f"[Gemini-Image] ⚠️  QUOTA ERROR — check billing at https://aistudio.google.com/apikey")
        else:
            print(f"[Gemini-Image] Exception: {e}")
        return None


async def image_prompt_node(state: ContentState) -> ContentState:
    """Generate per-page illustration prompts then call Nano Banana 2 concurrently for all 5 pages."""
    pages = state["story_parsed"].get("pages", [])
    prompts = []
    for page in pages:
        prompt = (
            f"{page['content'][:200]}. "
            f"Theme: {state['theme']}. Character: {state['character_name']}. "
            f"Art style: {state.get('art_style', 'cartoon')}. "
            f"Grade {state['grade']} children's storybook."
        )
        prompts.append(prompt)
    state["image_prompts"] = prompts

    # Generate page images sequentially with delay to avoid rate limits
    image_urls = []
    for i, p in enumerate(prompts):
        url = await _generate_image_nano_banana2(p)
        image_urls.append(url)
        if i < len(prompts) - 1:
            await asyncio.sleep(2)  # respect Gemini rate limits
    state["image_urls"] = image_urls
    return state


async def quiz_generator_node(state: ContentState) -> ContentState:
    """Generate 3 comprehension quiz questions per page via OpenRouter."""
    pages = state["story_parsed"].get("pages", [])
    title = state["story_parsed"].get("title", "the story")
    story_text = "\n".join([f"Page {p['page_number']}: {p['content']}" for p in pages])
    num_pages = len(pages)

    prompt = f"""Read this children's story and create exactly 3 multiple-choice quiz questions for EACH page ({num_pages} pages, so {num_pages * 3} questions total).

Story Title: {title}
Story Text:
{story_text}

For every page, create 3 questions testing comprehension of that specific page. Make them fun and age-appropriate for grade {state['grade']}.

Output ONLY valid JSON — an array of objects:
[
  {{
    "page_index": 1,
    "question": "Question about page 1?",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct_answer": "Choice B",
    "explanation": "Brief kid-friendly explanation"
  }},
  {{
    "page_index": 1,
    "question": "Another question about page 1?",
    "choices": ["Choice A", "Choice B", "Choice C", "Choice D"],
    "correct_answer": "Choice A",
    "explanation": "Brief kid-friendly explanation"
  }}
]
"""
    try:
        raw = await _call_gemini_text(system="You generate quiz questions. Respond with valid JSON only.", user=prompt)
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


async def run_content_agent(grade: int, theme: str, character_name: str, language: str = "english", art_style: str = "cartoon") -> dict:
    """Entry point — run the content generation graph."""
    initial_state: ContentState = {
        "grade": grade,
        "theme": theme,
        "character_name": character_name,
        "language": language,
        "art_style": art_style,
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
