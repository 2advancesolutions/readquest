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

# ── Character portrait gallery → Supabase public URLs ────────────────────────
# These were uploaded once and are permanent. Every gallery character maps to
# its high-quality portrait PNG so instant-character gets the exact reference.
_CDN = "https://nspehtlzknfbiwvjswge.supabase.co/storage/v1/object/public/characters/portraits"
CHAR_PORTRAIT_URLS: dict[str, str] = {
    "cipher":               f"{_CDN}/cipher.png",
    "disney_adventuregirl": f"{_CDN}/disney_adventuregirl.png",
    "disney_dragonrider":   f"{_CDN}/disney_dragonrider.png",
    "disney_farmboy":       f"{_CDN}/disney_farmboy.png",
    "disney_forestgirl":    f"{_CDN}/disney_forestgirl.png",
    "disney_icegirl":       f"{_CDN}/disney_icegirl.png",
    "disney_marineboy":     f"{_CDN}/disney_marineboy.png",
    "disney_musicgirl":     f"{_CDN}/disney_musicgirl.png",
    "disney_seaprince":     f"{_CDN}/disney_seaprince.png",
    "disney_snowqueen":     f"{_CDN}/disney_snowqueen.png",
    "disney_stargazer":     f"{_CDN}/disney_stargazer.png",
    "disney_sunprince":     f"{_CDN}/disney_sunprince.png",
    "disney_tinkerboy":     f"{_CDN}/disney_tinkerboy.png",
    "disney_witchgirl":     f"{_CDN}/disney_witchgirl.png",
    "fairy":                f"{_CDN}/fairy.png",
    "fox":                  f"{_CDN}/fox.png",
    "goddess":              f"{_CDN}/goddess.png",
    "hero_aquarush":        f"{_CDN}/hero_aquarush.png",
    "hero_blaze":           f"{_CDN}/hero_blaze.png",
    "hero_galaxybrave":     f"{_CDN}/hero_galaxybrave.png",
    "hero_gearbolt":        f"{_CDN}/hero_gearbolt.png",
    "hero_ironveil":        f"{_CDN}/hero_ironveil.png",
    "hero_moonshield":      f"{_CDN}/hero_moonshield.png",
    "hero_prismqueen":      f"{_CDN}/hero_prismqueen.png",
    "hero_shadowclaw":      f"{_CDN}/hero_shadowclaw.png",
    "hero_stoneguard":      f"{_CDN}/hero_stoneguard.png",
    "hero_stormwing":       f"{_CDN}/hero_stormwing.png",
    "hero_terravine":       f"{_CDN}/hero_terravine.png",
    "hero_thunderstrike":   f"{_CDN}/hero_thunderstrike.png",
    "hero_titanfist":       f"{_CDN}/hero_titanfist.png",
    "hero_windrunner":      f"{_CDN}/hero_windrunner.png",
    "knight_girl":          f"{_CDN}/knight_girl.png",
    "lion":                 f"{_CDN}/lion.png",
    "merlin":               f"{_CDN}/merlin.png",
    "nova_pulse":           f"{_CDN}/nova_pulse.png",
    "owl":                  f"{_CDN}/owl.png",
    "princess_aurora":      f"{_CDN}/princess_aurora.png",
    "princess_coral":       f"{_CDN}/princess_coral.png",
    "princess_ember":       f"{_CDN}/princess_ember.png",
    "princess_ivy":         f"{_CDN}/princess_ivy.png",
    "princess_jade":        f"{_CDN}/princess_jade.png",
    "princess_nova":        f"{_CDN}/princess_nova.png",
    "princess_pearl":       f"{_CDN}/princess_pearl.png",
    "princess_rosegold":    f"{_CDN}/princess_rosegold.png",
    "princess_sapphire":    f"{_CDN}/princess_sapphire.png",
    "princess_violet":      f"{_CDN}/princess_violet.png",
    "sherlock":             f"{_CDN}/sherlock.png",
    "sovereign":            f"{_CDN}/sovereign.png",
    # Name aliases — character display names map to icon keys
    "Sea Prince":     f"{_CDN}/disney_seaprince.png",
    "Snow Queen":     f"{_CDN}/disney_snowqueen.png",
    "Sun Prince":     f"{_CDN}/disney_sunprince.png",
    "Adventure Girl": f"{_CDN}/disney_adventuregirl.png",
    "Forest Girl":    f"{_CDN}/disney_forestgirl.png",
    "Marine Boy":     f"{_CDN}/disney_marineboy.png",
    "Star Gazer":     f"{_CDN}/disney_stargazer.png",
    "Dragon Rider":   f"{_CDN}/disney_dragonrider.png",
    "Music Girl":     f"{_CDN}/disney_musicgirl.png",
    "Tinker Boy":     f"{_CDN}/disney_tinkerboy.png",
    "Witch Girl":     f"{_CDN}/disney_witchgirl.png",
    "Farm Boy":       f"{_CDN}/disney_farmboy.png",
    "Ice Girl":       f"{_CDN}/disney_icegirl.png",
    "Blaze":          f"{_CDN}/hero_blaze.png",
    "Storm Wing":     f"{_CDN}/hero_stormwing.png",
    "Titan Fist":     f"{_CDN}/hero_titanfist.png",
    "Shadow Claw":    f"{_CDN}/hero_shadowclaw.png",
    "Aqua Rush":      f"{_CDN}/hero_aquarush.png",
    "Gear Bolt":      f"{_CDN}/hero_gearbolt.png",
    "Terra Vine":     f"{_CDN}/hero_terravine.png",
    "Moon Shield":    f"{_CDN}/hero_moonshield.png",
    "Thunder Strike": f"{_CDN}/hero_thunderstrike.png",
    "Iron Veil":      f"{_CDN}/hero_ironveil.png",
    "Galaxy Brave":   f"{_CDN}/hero_galaxybrave.png",
    "Wind Runner":    f"{_CDN}/hero_windrunner.png",
    "Prism Queen":    f"{_CDN}/hero_prismqueen.png",
    "Stone Guard":    f"{_CDN}/hero_stoneguard.png",
}


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


async def remove_background_from_bytes(img_bytes: bytes, white_threshold: int = 200) -> bytes:
    """
    Remove background from portrait image bytes, returning a transparent PNG.
    Strategy (in order):
      1. rembg  — AI-based deep learning removal (best quality, handles complex edges)
      2. Pillow flood-fill  — fast white/near-white removal from edges (fallback)
    """
    import io
    from PIL import Image, ImageFilter

    # ── 1. Try rembg (AI model — best quality, full resolution) ─────────────────
    try:
        from rembg import remove as rembg_remove, new_session
        # Get original image size so we can verify output isn't downscaled
        orig = Image.open(io.BytesIO(img_bytes))
        orig_size = orig.size
        orig.close()

        # Use u2net model — processes at full resolution, no forced resize
        session = await asyncio.to_thread(new_session, "u2net")
        result_bytes = await asyncio.to_thread(
            rembg_remove, img_bytes,
            session=session,
            only_mask=False,
            alpha_matting=True,         # smooth hair/wing edges
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )
        result_img = Image.open(io.BytesIO(result_bytes))
        print(f"[bg-remove] rembg ✓ orig={orig_size} → out={result_img.size} ({len(result_bytes)} bytes)")

        # If rembg severely downscaled, upscale back to original size
        if result_img.size[0] < orig_size[0] * 0.5:
            result_img = result_img.resize(orig_size, Image.LANCZOS)
            out2 = io.BytesIO()
            result_img.save(out2, format="PNG")
            result_bytes = out2.getvalue()
            print(f"[bg-remove] rembg upscaled back to {orig_size}")

        if result_img.size[0] > 10 and result_img.size[1] > 10:
            return result_bytes
        print("[bg-remove] rembg returned empty image — falling back to Pillow")
    except ImportError:
        print("[bg-remove] rembg not installed — using Pillow flood-fill")
    except Exception as e:
        print(f"[bg-remove] rembg failed ({e}) — using Pillow flood-fill")

    # ── 2. Pillow flood-fill (edges + aggressive threshold) ──────────────────────
    img = Image.open(io.BytesIO(img_bytes)).convert("RGBA")
    data = img.load()  # type: ignore
    width, height = img.size

    def _is_near_white(r: int, g: int, b: int) -> bool:
        return r >= white_threshold and g >= white_threshold and b >= white_threshold

    def _flood_fill(start_pixels: list[tuple[int, int]]) -> None:
        queue = list(start_pixels)
        visited: set[tuple[int, int]] = set(start_pixels)
        while queue:
            x, y = queue.pop()
            r, g, b, a = data[x, y]
            if not _is_near_white(r, g, b):
                continue
            # Full transparency for near-white pixels
            data[x, y] = (r, g, b, 0)
            for nx, ny in [(x-1, y), (x+1, y), (x, y-1), (x, y+1)]:
                if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                    nr, ng, nb, _ = data[nx, ny]
                    if _is_near_white(nr, ng, nb):
                        visited.add((nx, ny))
                        queue.append((nx, ny))

    # Seed from all edges (100% coverage of border pixels)
    seeds = []
    for x in range(width):
        seeds.append((x, 0))
        seeds.append((x, height - 1))
    for y in range(height):
        seeds.append((0, y))
        seeds.append((width - 1, y))
    _flood_fill(seeds)

    # Soft alpha blur on edges to remove fringing
    try:
        r_ch, g_ch, b_ch, a_ch = img.split()
        a_ch = a_ch.filter(ImageFilter.SMOOTH_MORE)
        img = Image.merge("RGBA", (r_ch, g_ch, b_ch, a_ch))
    except Exception:
        pass

    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()



class ContentState(TypedDict):
    grade: int
    theme: str
    character_name: str
    character_description: str   # e.g. "blonde braided hair, ice-blue dress, ice powers"
    character_universe: str      # e.g. "Frozen (Disney)"
    character_visual: str        # resolved = "{name} from {universe} — {description}" used by every FLUX call
    character_image_url: str     # optional gallery portrait — use as cover if provided (skip FLUX cover gen)
    language: str
    art_style: str
    grade_vocab_desc: str
    story_raw: str
    story_parsed: dict
    image_prompts: list
    image_urls: list        # fal.ai FLUX.1 [dev] generated image URLs
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
    art_style = state.get('art_style', 'cartoon')

    # Per-style narrative writing guide — shapes the TONE, PACING, and STRUCTURE of the story text
    ART_STYLE_NARRATIVE = {
        "cartoon": (
            "STORY STYLE — Fun & Playful Cartoon:\n"
            "Write in a light, funny, colorful tone. Use onomatopoeia (POW!, WHOOSH!, SPLAT!). "
            "Short punchy sentences mixed with fun descriptions. "
            "Characters are expressive, silly, and lovable. "
            "Ending is joyful and uplifting with a clear moral lesson."
        ),
        "cinematic": (
            "STORY STYLE — Cinematic Action:\n"
            "Write like a movie screenplay adapted for children. Use dramatic, action-packed prose. "
            "Describe scenes as if the camera is moving: sweeping wide shots, dramatic close-ups, slow-motion moments. "
            "Build tension scene by scene. Use vivid action verbs: DODGED, LAUNCHED, SOARED, BLASTED. "
            "Include sensory details: the storm roars, lightning flashes, the crowd holds its breath. "
            "Climax should feel like a movie's final battle. Ending: city cheers, sunrise on the skyline, emotional resolution. "
            "Ultra-dramatic, cinematic language — adapted to the reading grade level."
        ),
        "pixar": (
            "STORY STYLE — Pixar / Animated Adventure:\n"
            "Write like a Pixar movie — heart, humor, and emotion in equal measure. "
            "Characters crack jokes mid-danger ('Seriously? NOW the alarm goes off?!'). "
            "Use bright, vivid descriptions that feel like animated color. "
            "Include a moment of doubt where the hero almost gives up, then rallies. "
            "Use expressive, funny dialogue moments even if written as narration. "
            "Ending: pure joy, confetti, cheering crowds, uplifting music-vibe energy. Wholesome and heartwarming."
        ),
        "real": (
            "STORY STYLE — Gritty Realistic:\n"
            "Write in a grounded, intense, realistic tone. Rain pours. Streets crack. Stakes feel real. "
            "The hero struggles — gets knocked down, feels fear, doubts themselves. "
            "Use sensory realism: wet pavement, distant sirens, echo of footsteps. "
            "Action is physical and tactical — no magic shortcuts, every win is earned through effort and grit. "
            "Climax: slow-motion impact, moment of silence, then relief washes over. "
            "Ending: quiet heroism — emergency crews arrive, civilians approach with gratitude. No fanfare, just truth."
        ),
        "comic": (
            "STORY STYLE — Comic Book Action:\n"
            "Write like a comic book — bold, punchy, HIGH ENERGY. "
            "Use on-panel text effects integrated into narration: WHAM! ZZAP! CRASH! THWAP! "
            "Short, impactful sentences. Dramatic cliffhangers between panels (pages). "
            "Describe action like a dynamic rooftop chase across comic panels. "
            "Include a power move or signature attack in the climax. "
            "Ending: hero stands on a rooftop, cape/silhouette against the city, crowd goes wild. Iconic. Epic."
        ),
        "epic": (
            "STORY STYLE — Epic Blockbuster Trailer:\n"
            "Write like a movie TRAILER — fast cuts, massive scale, world-shaking stakes. "
            "Open with chaos: explosions, collapsing buildings, civilians running. "
            "Use punchy 2-3 word sentences for impact: 'The city shook. Alarms blared. Only one hero remained.' "
            "Build dramatically: each page escalates the danger. "
            "Climax: the hero unleashes their ultimate power — bio-electric energy, shockwave, city-wide flash of light. "
            "Ending: calm descends. Citizens cheer. Hero stands on a skyscraper at sunset. Cinematic final shot."
        ),
    }

    style_narrative = ART_STYLE_NARRATIVE.get(art_style, ART_STYLE_NARRATIVE['cartoon'])

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

    # ── Detect if the theme field is a full pasted story ──────────────────────
    # Heuristic: >300 chars AND (3+ paragraph breaks OR 4+ non-empty lines OR long avg line length)
    # This catches "The Forest Girl" style full-story pastes vs short theme prompts.
    raw_theme = state['theme']
    theme_lines = [l for l in raw_theme.split('\n') if l.strip()]
    is_full_story = (
        len(raw_theme.strip()) > 300
        and (
            raw_theme.count('\n\n') >= 2          # multiple paragraph breaks
            or len(theme_lines) >= 4              # 4+ non-empty lines
            or (len(raw_theme) / max(len(theme_lines), 1)) > 80  # long avg line length
        )
    )

    if is_full_story:
        # ── STORY ADAPTATION MODE ─────────────────────────────────────────────
        # User pasted a full story. Adapt it into 5 pages starring the chosen character.
        print(f"[story_writer_node] 📖 Detected full-story paste ({len(raw_theme)} chars) — switching to ADAPTATION mode.")

        prompt = f"""You are a brilliant children's book author writing for a Grade {grade} reading level.

Grade Level Writing Guide:
{vocab_desc}

Main Character (hero of the story): {char}
Language: {state.get('language', 'english')}
Art Style: {art_style}
{early_grade_warning}
{style_narrative}

A user has provided the following story as inspiration:
--- SOURCE STORY START ---
{raw_theme}
--- SOURCE STORY END ---

YOUR TASK:
Adapt and retell this story as a 5-page children's book where {char} is the main hero doing all the key actions.

STRICT RULES FOR ADAPTATION:
- Divide the story's plot naturally into EXACTLY 5 pages. Each page must capture a DISTINCT moment or scene.
- Page 1: Introduce {char} and the world/situation from the story.
- Pages 2-4: Show {char} experiencing the rising action and conflict from the source story.
- Page 5: Show {char} achieving the resolution and emotional lesson from the story's ending.
- Every page MUST feature {char} actively doing something — no page should ever just describe scenery alone.
- Keep the spirit, theme, and emotional arc of the source story — but rewrite it fresh at Grade {grade} level.
- Do NOT copy the source text verbatim. Rewrite it with your own engaging language.
- Apply the chosen art style tone throughout: {style_narrative[:120]}

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

CRITICAL — CHARACTER NAME RULES (MUST FOLLOW):
- Use the character name EXACTLY as given: "{char}"
- Do NOT add a last name, surname, or title
- Do NOT translate, expand, or rename the character
- Every reference to the character must use exactly "{char}"
- NO quotation marks inside page text that would break JSON
"""
    else:
        # ── ORIGINAL FREE-GENERATE MODE ───────────────────────────────────────
        prompt = f"""You are a brilliant children's book author writing for a Grade {grade} reading level.

Grade Level Writing Guide:
{vocab_desc}

Theme / Setting: {raw_theme}
Main Character: {char}
Language: {state.get('language', 'english')}
Art Style Selected: {art_style}
{early_grade_warning}
{style_narrative}

Write a complete, engaging children's story in {state.get('language', 'english')} with EXACTLY 5 pages.
The story MUST follow the STORY STYLE instructions above — the narrative tone, pacing, and structure should
clearly match the selected style. A cinematic story should feel like watching a movie. A comic story should
feel like reading panels. An epic story should feel like a blockbuster trailer. Adapt the language complexity
to Grade {grade} but KEEP the style's energy and structure intact.

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
- Page 1: Introduce {char} and the setting using the selected style's opening energy
- Pages 2-4: Build the adventure and conflict with escalating style-appropriate tension
- Page 5: Resolution and a positive lesson — style-appropriate ending (cinematic sunrise, epic silhouette, etc.)
- Make it fun, exciting, and suitable for the reading level
- NO quotation marks inside the page text that would break JSON

CRITICAL — CHARACTER NAME RULES (MUST FOLLOW):
- Use the character name EXACTLY as given: "{char}"
- Do NOT add a last name, surname, or title (e.g. if given "Dora" write "Dora" NOT "Dora Márquez" or "Dora the Explorer")
- Do NOT translate, expand, or creatively rename the character
- Every reference to the character in the story must use exactly "{char}"
"""
    raw = await _call_gemini_text(
        system="You are a creative children's book author. Always respond with valid JSON only. Follow ALL grade level, character name, AND story style instructions exactly.",
        user=prompt,
        temperature=0.75,
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



async def _generate_image_nano_banana2(
    prompt: str,
    reference_image_url: Optional[str] = None,
    art_style: str = "cartoon",
) -> Optional[str]:
    """Generate a per-page illustration using fal.ai.

    Model Priority:
    1. fal-ai/recraft-v3  — PRIMARY. SOTA children's illustration model with
       native style presets (digital_illustration, realistic_image, etc.).
       #1 on HuggingFace Text-to-Image benchmark.
    2. fal-ai/flux/dev     — FALLBACK if Recraft fails.
    3. fal-ai/flux-general  — LAST RESORT.

    The user's art style selection directly maps to Recraft V3's native presets:
      cartoon   → digital_illustration
      pixar     → digital_illustration (sub-style: handmade_3d)
      cinematic → realistic_image
      real      → realistic_image
      comic     → digital_illustration (sub-style: 2d_art_poster)
      epic      → realistic_image

    Returns a Supabase public URL or local /static/images/<uuid>.png path, or None on failure.
    """
    import os

    fal_key = settings.FAL_AI or os.environ.get("FAL_AI", "")
    if not fal_key:
        print("[fal.ai] No FAL_AI key — skipping image generation")
        return None

    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    # Prompt cap — Recraft supports long prompts but cap for safety
    image_prompt = prompt[:900]

    # ── Map user art style → Recraft V3 native style presets ──────────────────
    RECRAFT_STYLE_MAP: dict[str, dict] = {
        "cartoon": {
            "style": "digital_illustration",
            # Default sub-style — warm, colorful children's book look
        },
        "pixar": {
            "style": "digital_illustration",
            "style_id": "digital_illustration/handmade_3d",  # Pixar/clay 3D look
        },
        "cinematic": {
            "style": "realistic_image",
            # Photorealistic cinematic — dramatic film lighting
        },
        "real": {
            "style": "realistic_image",
            # Gritty photorealistic — documentary style
        },
        "comic": {
            "style": "digital_illustration",
            "style_id": "digital_illustration/2d_art_poster",  # Bold comic poster art
        },
        "epic": {
            "style": "realistic_image",
            # Epic blockbuster key art — dramatic realism
        },
    }

    recraft_config = RECRAFT_STYLE_MAP.get(art_style, RECRAFT_STYLE_MAP["cartoon"])

    try:
        import fal_client
        os.environ["FAL_KEY"] = fal_key

        # ── PRIMARY: Recraft V3 ──────────────────────────────────────────────────
        # SOTA illustration model with native style presets. The user's art style
        # selection maps directly to Recraft's built-in styles, producing
        # dramatically better results than generic text-to-image models.
        print(f"[fal.ai] PRIMARY: Recraft V3 (style={recraft_config.get('style')}, "
              f"sub={recraft_config.get('style_id', 'default')}) — prompt ({len(image_prompt)} chars)")
        print(f"[fal.ai]   prompt: {image_prompt[:140]}...")

        recraft_args: dict = {
            "prompt": image_prompt,
            "style": recraft_config["style"],
            "size": "square_hd",
            # Request pure white background  — critical for clean background removal
            "background_color": {"r": 255, "g": 255, "b": 255},
        }
        # Add sub-style if specified (e.g., handmade_3d for Pixar)
        if "style_id" in recraft_config:
            recraft_args["style_id"] = recraft_config["style_id"]

        try:
            result = await asyncio.to_thread(
                fal_client.subscribe,
                "fal-ai/recraft-v3",
                arguments=recraft_args,
            )
            print(f"[fal.ai] Recraft V3 ✓ success")
        except Exception as recraft_err:
            # ── FALLBACK 1: flux/dev ──────────────────────────────────────────
            print(f"[fal.ai] Recraft V3 failed ('{recraft_err}') — fallback to flux/dev...")
            try:
                result = await asyncio.to_thread(
                    fal_client.subscribe,
                    "fal-ai/flux/dev",
                    arguments={
                        "prompt": image_prompt,
                        "image_size": "square_hd",
                        "num_inference_steps": 28,
                        "guidance_scale": 4.5,
                        "num_images": 1,
                        "enable_safety_checker": True,
                        "output_format": "png",
                    },
                )
                print(f"[fal.ai] flux/dev ✓ fallback success")
            except Exception as dev_err:
                # ── FALLBACK 2: flux-general ──────────────────────────────────
                print(f"[fal.ai] flux/dev failed ('{dev_err}') — fallback to flux-general...")
                result = await asyncio.to_thread(
                    fal_client.subscribe,
                    "fal-ai/flux-general",
                    arguments={
                        "prompt": image_prompt,
                        "image_size": "square_hd",
                        "num_inference_steps": 28,
                        "guidance_scale": 4.5,
                        "num_images": 1,
                        "enable_safety_checker": False,
                        "output_format": "png",
                    },
                )

        # Extract the image URL from fal.ai response
        images = result.get("images", [])
        if not images:
            print("[fal.ai] No images returned in response")
            return None

        fal_image_url = images[0].get("url")
        if not fal_image_url:
            print("[fal.ai] No URL in image response")
            return None

        print(f"[fal.ai] Got image URL from fal.ai, downloading...")

        # Download the image bytes from fal.ai's temporary URL
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(fal_image_url)
            if resp.status_code != 200:
                print(f"[fal.ai] Failed to download image: HTTP {resp.status_code}")
                return None
            img_bytes = resp.content

        # ── Black image guard ────────────────────────────────────────────────────
        # instant-character sometimes returns a 1024×1024 black PNG when it can't
        # process the reference image (invalid URL, format issue, etc.).
        # Detect this by checking mean brightness — if < 15/255 it's basically black.
        # Fall back to flux/dev (text-only) so the student at least gets a real image.
        try:
            import io
            from PIL import Image as _PILImage
            _pil = _PILImage.open(io.BytesIO(img_bytes)).convert("L")  # grayscale
            import statistics as _stats
            _pixels = list(_pil.getdata())
            _mean_brightness = _stats.mean(_pixels)
            print(f"[fal.ai] Image brightness check: mean={_mean_brightness:.1f}/255")
            if _mean_brightness < 15:
                print(f"[fal.ai] ⚠ BLACK IMAGE detected (mean={_mean_brightness:.1f}) — falling back to flux/dev text-only")
                fallback_result = await asyncio.to_thread(
                    fal_client.subscribe,
                    "fal-ai/flux/dev",
                    arguments={
                        "prompt": image_prompt,
                        "image_size": "square_hd",
                        "num_inference_steps": 28,
                        "guidance_scale": 4.5,
                        "num_images": 1,
                        "enable_safety_checker": True,
                        "output_format": "png",
                    },
                )
                fallback_images = fallback_result.get("images", [])
                if fallback_images and fallback_images[0].get("url"):
                    async with httpx.AsyncClient(timeout=30) as client2:
                        fb_resp = await client2.get(fallback_images[0]["url"])
                        if fb_resp.status_code == 200:
                            img_bytes = fb_resp.content
                            print(f"[fal.ai] ✓ flux/dev fallback image downloaded OK")
        except Exception as bright_err:
            print(f"[fal.ai] brightness check error (non-fatal): {bright_err}")

        # Upload to Supabase Storage for persistence
        filename = f"{uuid.uuid4().hex}.png"
        public_url = await _upload_to_supabase(img_bytes, filename)
        if public_url:
            print(f"[fal.ai] ✅ Image uploaded to Supabase: {public_url}")
            return public_url

        # Fallback: save locally
        STATIC_DIR.mkdir(parents=True, exist_ok=True)
        (STATIC_DIR / filename).write_bytes(img_bytes)
        print(f"[fal.ai] Saved locally (no Supabase key): static/images/{filename} ({len(img_bytes)} bytes)")
        return f"/static/images/{filename}"

    except Exception as e:
        print(f"[fal.ai] Exception: {e}")
        return None



async def remove_background_from_bytes(img_bytes: bytes) -> bytes:
    """
    Remove the white background from image bytes using Pillow only.
    Flood-fills from all 4 corners to identify background white pixels
    and makes them fully transparent. Uses a hard-edge mask — no feathering
    that would destroy character details like light-colored fur or skin.
    Returns PNG bytes with a transparent background.
    Falls back to the original bytes if anything fails.
    """
    def _do_remove(data: bytes) -> bytes:
        from PIL import Image
        import io
        import numpy as np

        img = Image.open(io.BytesIO(data)).convert("RGBA")
        arr = np.array(img)

        # Threshold: only pure/near-pure white pixels are background candidates
        # Using 230 (not 220) so we don't accidentally catch light-colored fur/skin
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        white_mask = (r > 230) & (g > 230) & (b > 230)

        # Flood fill from all 4 corners to get ONLY the connected outer background
        # (avoids removing white pixels that are INSIDE the character boundary)
        h, w = arr.shape[:2]
        flood_mask = np.zeros((h, w), dtype=bool)

        def flood_from(start_y, start_x):
            """BFS flood fill from corner through white pixels."""
            if not white_mask[start_y, start_x]:
                return
            from collections import deque
            q = deque()
            q.append((start_y, start_x))
            while q:
                cy, cx = q.popleft()
                if cy < 0 or cy >= h or cx < 0 or cx >= w:
                    continue
                if flood_mask[cy, cx] or not white_mask[cy, cx]:
                    continue
                flood_mask[cy, cx] = True
                q.extend([(cy+1, cx), (cy-1, cx), (cy, cx+1), (cy, cx-1)])

        flood_from(0, 0)
        flood_from(0, w - 1)
        flood_from(h - 1, 0)
        flood_from(h - 1, w - 1)

        # Hard-edge erase: set flooded background pixels to fully transparent
        # NO feathering — feathering destroys character detail (light-colored fur, highlights)
        arr[flood_mask, 3] = 0

        result_img = Image.fromarray(arr, "RGBA")
        buf = io.BytesIO()
        result_img.save(buf, format="PNG")
        return buf.getvalue()

    try:
        print("[bg-remove] Removing white background from portrait…")
        result = await asyncio.to_thread(_do_remove, img_bytes)
        print(f"[bg-remove] Done — transparent PNG {len(result)} bytes")
        return result
    except Exception as e:
        print(f"[bg-remove] Failed (non-fatal, returning original): {e}")
        return img_bytes





async def image_prompt_node(state: ContentState) -> ContentState:
    """
    FLUX image pipeline with character reference locking.
    1. Resolves a rich character_visual string (from provided description or Gemini auto-enrich).
    2. Saves character_visual to state so every downstream node uses the SAME description.
    3. Builds per-page prompts with the character as the MANDATORY main subject.
    4. Generates ALL page images using the gallery portrait as a visual reference anchor,
       so every page shows a character that looks like the selected portrait.
    """
    pages = state["story_parsed"].get("pages", [])
    art_style = state.get('art_style', 'cartoon')
    char = state['character_name']
    theme = state['theme']

    # ── Character reference image (gallery portrait) — the visual identity anchor ────────
    # This URL is passed to every FLUX call as reference_image_url so the model produces
    # a character that LOOKS LIKE the gallery portrait on every single page.
    char_ref_url = (state.get('character_image_url') or '').strip() or None
    if char_ref_url:
        print(f"[image_prompt_node] ✓ Reference portrait URL found — character identity will be locked.")
    else:
        print(f"[image_prompt_node] No reference portrait — using text-only generation (may drift).")

    # ── Resolve character_visual (used by EVERY image in the pipeline) ──────────────────
    char_desc = (state.get('character_description') or '').strip()
    char_universe = (state.get('character_universe') or '').strip()

    if char_desc and char_universe:
        character_visual = f"{char} from {char_universe} — {char_desc}"
    elif char_desc:
        character_visual = f"{char} — {char_desc}"
    elif char_universe:
        character_visual = f"{char} from {char_universe}"
    else:
        # Auto-enrich: ask Gemini for canvas-ready visual description of this character
        try:
            enrich_prompt = (
                f'You are a character expert for image generation. '
                f'Give a one-sentence visual description of "{char}" with: '
                f'exact hair color+style, outfit colors+details, any iconic props/features. '
                f'Be very specific. Example: "blue-eyed blonde girl in ice-blue sparkling gown with platinum braid, ice magic". '
                f'If completely unknown, say "{char} — heroic adventurer". No other text.'
            )
            enriched = await _call_gemini_text(
                system="You produce visual descriptions for image generation. One sentence only, no extra text.",
                user=enrich_prompt,
                temperature=0.1
            )
            enriched = enriched.strip().strip('"').strip("'")
            if len(enriched) > 15 and enriched.lower() != char.lower():
                character_visual = enriched if char.lower() in enriched.lower() else f"{char} — {enriched}"
            else:
                character_visual = char
        except Exception as e:
            print(f"[image_prompt_node] Gemini auto-enrich failed: {e}")
            character_visual = char

    # Append a small/young size anchor so the AI never renders a grown adult.
    # This is injected into EVERY per-page prompt, keeping the character consistently
    # small, cute, and juvenile regardless of camera angle or lighting.
    if not any(kw in character_visual.lower() for kw in ["young", "small", "little", "child", "cub", "kid", "tiny", "juvenile"]):
        character_visual = character_visual + ", small and young, child-sized proportions, cute and compact build"

    # Save to state so character_verify and assemble_result can reuse the same description
    state["character_visual"] = character_visual
    print(f"[image_prompt_node] ✓ character_visual: {character_visual}")

    # ── Recraft V3 prompt templates ──────────────────────────────────────────────────────
    # Recraft handles style natively via presets (set in _generate_image_nano_banana2).
    # Prompts focus on CONTENT: character + scene + composition. No "MASTERPIECE, 8K" hacks needed.
    ART_STYLE_PROMPTS = {
        "cartoon": (
            "Children's book illustration. "
            "MAIN CHARACTER in foreground, full body visible, expressive face: {cv}. "
            "Scene: {scene}. "
            "Bright vivid colors, bold outlines, charming storybook atmosphere, whimsical, warm."
        ),
        "cinematic": (
            "Cinematic film still, dramatic camera angle, professional cinematography. "
            "HERO CHARACTER in foreground, dynamic pose, photorealistic detail: {cv}. "
            "Scene: {scene}. "
            "Volumetric lighting, film grain, dramatic shadows, high contrast, intense atmosphere."
        ),
        "pixar": (
            "3D animated film still, Pixar/Disney quality. "
            "MAIN CHARACTER in foreground, expressive 3D face, clay-like texture: {cv}. "
            "Scene: {scene}. "
            "Soft global illumination, magical lighting, depth of field, vibrant colors."
        ),
        "real": (
            "Photorealistic documentary photography, sharp and detailed. "
            "MAIN SUBJECT in foreground, intense focus, detailed skin and fabric: {cv}. "
            "Scene: {scene}. "
            "Natural lighting, high dynamic range, authentic textures, candid moment."
        ),
        "comic": (
            "Dynamic comic book splash page, bold and energetic. "
            "HERO CHARACTER in action pose, strong ink lines, clear design: {cv}. "
            "Scene: {scene}. "
            "Vivid primary colors, speed lines, high energy composition, professional comic art."
        ),
        "epic": (
            "Blockbuster movie poster, grand scale, heroic composition. "
            "HERO standing triumphant, glowing silhouette, epic presence: {cv}. "
            "Scene: {scene}. "
            "Atmospheric lighting, dramatic sky, cinematic scale, intense color grading."
        ),
    }
    style_template = ART_STYLE_PROMPTS.get(art_style, ART_STYLE_PROMPTS['cartoon'])

    # ── Per-page CINEMATIC DIRECTION ─────────────────────────────────────────────────
    # Each page gets a DIFFERENT camera angle + lighting + composition so flux/dev
    # generates visually distinct illustrations instead of the same pose 5 times.
    PAGE_DIRECTION = [
        # Page 1 — OPENING: wide establishing world-building shot
        {
            "camera":    "WIDE ESTABLISHING SHOT, full environment visible, character small in frame",
            "lighting":  "bright morning sunlight, soft warm rays, clear sky",
            "mood":      "wonder and excitement, peaceful but something stirs",
            "action":    "character looking out at the world, curious expression",
        },
        # Page 2 — RISING ACTION: medium shot, first challenge begins
        {
            "camera":    "MEDIUM SHOT, character from waist up, environment behind them",
            "lighting":  "dramatic side lighting, golden hour, long shadows",
            "mood":      "tension rising, alert and focused",
            "action":    "character reacting with surprise or determination",
        },
        # Page 3 — MIDPOINT: dynamic over-the-shoulder or running shot
        {
            "camera":    "DYNAMIC DUTCH ANGLE, low perspective looking up at character, sense of movement",
            "lighting":  "stormy dramatic sky, strong contrast, atmospheric fog",
            "mood":      "high energy, urgent, adventure at peak",
            "action":    "character in full motion — running, jumping, or fighting",
        },
        # Page 4 — CLIMAX: tight medium close-up (NOT extreme — preserves full character silhouette/scale)
        {
            "camera":    "TIGHT MEDIUM CLOSE-UP, character from knees to top of head fully visible, small body in full frame",
            "lighting":  "intense dramatic spotlight, deep shadows, glowing energy effects",
            "mood":      "maximum drama, biggest moment, epic confrontation",
            "action":    "character's most powerful or emotional moment, small body radiating big energy",
        },
        # Page 5 — RESOLUTION: warm celebratory wide shot
        {
            "camera":    "WIDE HERO SHOT, character centered triumphant, full environment glowing",
            "lighting":  "warm golden sunset, soft lens flare, magical golden hour",
            "mood":      "joy, victory, peace restored",
            "action":    "character celebrating, smiling, or at rest — happy ending",
        },
    ]

    prompts = []
    total_pages = len(pages)
    for i, page in enumerate(pages):
        full_content = page['content'].strip()
        direction = PAGE_DIRECTION[i] if i < len(PAGE_DIRECTION) else PAGE_DIRECTION[-1]

        # Build a visually directive scene prompt — camera + light + mood + actual story content
        scene_directive = (
            f"{direction['camera']}. "
            f"Lighting: {direction['lighting']}. "
            f"Mood: {direction['mood']}. "
            f"Action: {direction['action']}. "
            f"Story moment: {full_content[:300]}"
        )

        # Build the full style-anchored prompt
        styled_prompt = style_template.format(cv=character_visual, scene=scene_directive)

        # Cap at 900 chars
        if len(styled_prompt) > 900:
            styled_prompt = styled_prompt[:900]

        prompts.append(styled_prompt)

    state["image_prompts"] = prompts
    print(f"[image_prompt_node] ── {len(prompts)} UNIQUE PAGE PROMPTS ─────────────────────")
    for i, p in enumerate(prompts):
        # Print the [Page X of 5 — SCENE]:  section so we can verify story content
        scene_start = p.find('[Page ')
        scene_text = p[scene_start:scene_start + 220] if scene_start >= 0 else p[:220]
        print(f"  ► Page {i+1}: {scene_text}")
    print(f"[image_prompt_node] ──────────────────────────────────────────────")

    # ── Generate ALL page images in parallel via asyncio.gather ──────────────────────
    # With reference_image_url + unique seed hints, fal.ai caching is not a concern.
    # Running all 5 in parallel cuts total image generation time from ~5×30s to ~30s.
    import random as _random

    async def _gen_page(p: str, idx: int) -> Optional[str]:
        clean_prompt = p.split(' [unique_seed:')[0] if ' [unique_seed:' in p else p
        url = await _generate_image_nano_banana2(clean_prompt, reference_image_url=char_ref_url, art_style=art_style)
        print(f"[image_prompt_node] Page {idx+1}/{len(prompts)} image: {'OK ✓' if url else 'FAILED ✗'}")
        return url

    image_urls = list(await asyncio.gather(*[_gen_page(p, i) for i, p in enumerate(prompts)]))

    print(f"[image_prompt_node] Done: {sum(1 for u in image_urls if u)} / {len(image_urls)} images OK")
    state["image_urls"] = image_urls
    return state


async def character_verify_node(state: ContentState) -> ContentState:
    """Verify page images contain the character — BYPASSED when reference_image_url is active.

    With reference_image_url locking character identity in every FLUX call, this extra
    Gemini verification + potential FLUX re-generation pass is unnecessary and adds ~30-60s
    of latency. We skip it whenever a gallery portrait reference was used.
    """
    char_ref_url = (state.get('character_image_url') or '').strip() or None
    if char_ref_url:
        print("[character_verify] BYPASSED — reference portrait active, character identity is already locked.")
        return state

    # ── Text-only path: still verify since character may drift without a reference ────────
    char = state['character_name']
    # Use the resolved visual description for regeneration — same one used in image_prompt_node
    character_visual = state.get('character_visual') or char
    pages = state["story_parsed"].get("pages", [])
    image_urls = list(state.get("image_urls", []))
    art_style = state.get('art_style', 'cartoon')

    # Only verify pages that got a real HTTP image URL
    verifiable = [i for i, url in enumerate(image_urls) if url and url.startswith("http")]
    if not verifiable:
        print("[character_verify] No HTTP image URLs to verify — skipping")
        return state

    page_list = "\n".join([
        f"Page {i+1} (index {i}): {image_urls[i]}"
        for i in verifiable
    ])
    verify_prompt = f"""You are a children's book quality checker.
The selected character for this story is: \"{char}\"

Below are image URLs for story pages. For each one decide:
- Does the image CLEARLY show a character matching \"{char}\"?
- YES only if the character is visibly the main subject.
- NO if it is just background/scenery with no clear main character, or shows the wrong character.

{page_list}

Respond ONLY with valid JSON — array ordered same as above:
[{{"page_index": <0-based int>, "has_character": true/false, "reason": "<one sentence>"}}]
"""

    failed_indexes: list = []
    try:
        raw = await _call_gemini_text(
            system="You are a strict children's book art director. Reply with valid JSON only.",
            user=verify_prompt,
            temperature=0.1,
        )
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        checks = json.loads(raw.strip())
        for item in checks:
            page_idx = item.get("page_index")
            has_char = item.get("has_character", True)
            reason = item.get("reason", "")
            print(f"[character_verify] Page {page_idx+1}: has_character={has_char} — {reason}")
            if not has_char and page_idx is not None and 0 <= page_idx < len(image_urls):
                failed_indexes.append(page_idx)
    except Exception as e:
        print(f"[character_verify] Verification call failed (non-fatal): {e}")
        return state

    if not failed_indexes:
        print("[character_verify] All pages passed character check")
        return state

    print(f"[character_verify] Regenerating {len(failed_indexes)} page(s) via FLUX: {[i+1 for i in failed_indexes]}")

    # Regen template uses full character_visual — same description as the original page renders
    REGEN_TEMPLATE = (
        "{style_decl}"
        "MANDATORY CHARACTER (largest foreground subject, clearly recognizable): {cv}. "
        "This character MUST dominate the image. "
        "Scene action: {scene}. "
        "Context/theme: {theme}. Safe for kids, high quality, no text."
    )
    STYLE_DECLS = {
        "cartoon": "Colorful children's book cartoon illustration. ",
        "cinematic": "ULTRA-REALISTIC CINEMATIC PHOTO, NOT a cartoon. ",
        "pixar": "Pixar 3D CGI animated render. ",
        "real": "GRITTY PHOTOREALISTIC PHOTOGRAPHY, absolutely NOT a cartoon. ",
        "comic": "Marvel/DC comic book illustration. ",
        "epic": "Epic IMAX movie poster art, NOT a cartoon. ",
    }
    style_decl = STYLE_DECLS.get(art_style, "Colorful children's book illustration. ")

    # Get the reference portrait URL so regen calls also use the visual anchor
    char_ref_url = (state.get('character_image_url') or '').strip() or None

    regen_tasks = {}
    for page_idx in failed_indexes:
        page_content = pages[page_idx]['content'][:200] if page_idx < len(pages) else ""
        regen_prompt = REGEN_TEMPLATE.format(
            style_decl=style_decl,
            cv=character_visual,
            scene=page_content,
            theme=state['theme'],
        )
        print(f"[character_verify] Queuing FLUX regen for page {page_idx+1} (reference_locked={char_ref_url is not None})...")
        regen_tasks[page_idx] = _generate_image_nano_banana2(regen_prompt, reference_image_url=char_ref_url, art_style=art_style)

    # Run all regenerations in parallel
    results = await asyncio.gather(*regen_tasks.values(), return_exceptions=True)
    for page_idx, result in zip(regen_tasks.keys(), results):
        if isinstance(result, str) and result:
            image_urls[page_idx] = result
            print(f"[character_verify] Page {page_idx+1} regenerated OK via FLUX")
        else:
            print(f"[character_verify] FLUX regen failed for page {page_idx+1}: {result}")

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

IMPORTANT: The correct answer must be placed at a DIFFERENT position (A, B, C, or D) for each question. Do NOT always put the correct answer in position B. Vary the positions evenly across A, B, C, and D.

Output ONLY valid JSON — an array of objects:
[
  {{
    "page_index": 1,
    "question": "What was the main character doing at the start?",
    "choices": ["Exploring the forest", "Sleeping in bed", "Eating breakfast", "Flying a kite"],
    "correct_answer": "Exploring the forest",
    "explanation": "Brief kid-friendly explanation"
  }},
  {{
    "page_index": 1,
    "question": "Where did the story begin?",
    "choices": ["Under the sea", "On a mountain", "In a magical forest", "Inside a spaceship"],
    "correct_answer": "In a magical forest",
    "explanation": "Brief kid-friendly explanation"
  }},
  {{
    "page_index": 2,
    "question": "Why was the hero surprised?",
    "choices": ["The sky turned green", "A friend appeared", "The map was wrong", "They found a glowing stone"],
    "correct_answer": "They found a glowing stone",
    "explanation": "Brief kid-friendly explanation"
  }}
]
"""
    import random as _random

    try:
        raw = await _call_gemini_text(system="You generate quiz questions. Respond with valid JSON only.", user=prompt)
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        parsed_qs = json.loads(raw.strip())

        # ── Shuffle choices after parsing ─────────────────────────────────────
        # No matter what position the LLM chose, we randomly shuffle the answer
        # list. We track correct_answer by its TEXT value, so it stays correct
        # after the shuffle — this guarantees A/B/C/D are all equally likely.
        for q in parsed_qs:
            choices = q.get("choices", [])
            correct = q.get("correct_answer", "")
            if choices and correct in choices:
                _random.shuffle(choices)
                q["choices"] = choices
                # correct_answer is stored as the answer text, not a letter index
                # so no update needed — the frontend matches by value, not position

        state["quiz_questions"] = parsed_qs
    except Exception:
        state["quiz_questions"] = []
    return state


async def assemble_result_node(state: ContentState) -> ContentState:
    """Assemble the final story result — generates a dedicated FLUX cover image."""
    pages = state["story_parsed"].get("pages", [])
    quiz_raw = state.get("quiz_questions", [])
    character_visual = state.get('character_visual') or state['character_name']
    art_style = state.get('art_style', 'cartoon')
    story_title = state["story_parsed"].get("title", f"{state['character_name']}'s Adventure")

    # ── Cover image: use gallery portrait if provided, otherwise generate via FLUX ──────────────
    COVER_TEMPLATES = {
        "cartoon": (
            "Children's book cover illustration. "
            "HERO CHARACTER (large, centered, triumphant pose, full body): {cv}. "
            "Magical vibrant background themed around '{theme}', bright and inviting, "
            "celebratory composition, bold colors, storybook quality, no text, high resolution."
        ),
        "cinematic": (
            "Cinematic movie poster. NOT a cartoon. Photorealistic Hollywood style. "
            "HERO (dominating the frame, dramatic backlit, powerful pose): {cv}. "
            "Epic '{theme}' background, dramatic volumetric lighting, lens flare, film grain, IMAX quality, no text."
        ),
        "pixar": (
            "Pixar 3D animated film poster render. "
            "MAIN CHARACTER (large, joyful expressive pose, center): {cv}. "
            "Vibrant '{theme}' world in background, warm cinematic lighting, Pixar studio quality, no text, 8K."
        ),
        "real": (
            "Gritty photorealistic book cover. NOT a cartoon. "
            "HERO (intense gaze, powerful stance, photoreal): {cv}. "
            "Moody '{theme}' environment, dramatic lighting, DSLR quality, high contrast, no text."
        ),
        "comic": (
            "Marvel/DC comic book cover art. Dynamic composition. "
            "HERO (iconic costume, action pose, bold inks): {cv}. "
            "'{theme}' action background, halftone shading, vivid colors, no text overlay."
        ),
        "epic": (
            "Epic blockbuster movie poster, NOT a cartoon. "
            "HERO (god-tier heroic pose, massive scale, backlit by energy): {cv}. "
            "Explosive '{theme}' background, god rays, lens flares, cinematic grade, 8K ultra, no text."
        ),
    }

    preselected_cover = (state.get('character_image_url') or '').strip()
    if preselected_cover:
        # User selected from the gallery — reuse that portrait as the story cover.
        # Skips ~30s of FLUX generation AND guarantees the cover matches Step 1.
        print(f"[assemble_result_node] Using gallery portrait as cover: {preselected_cover}")
        cover_url = preselected_cover
    else:
        cover_template = COVER_TEMPLATES.get(art_style, COVER_TEMPLATES['cartoon'])
        cover_prompt = cover_template.format(cv=character_visual, theme=state['theme'])
        print(f"[assemble_result_node] Generating FLUX cover image...")
        cover_url = await _generate_image_nano_banana2(cover_prompt, art_style=art_style)
        print(f"[assemble_result_node] Cover: {cover_url or 'FAILED — using page 1 fallback'}")

    # Fallback to first page image if cover generation failed
    if not cover_url and state.get("image_urls"):
        cover_url = state["image_urls"][0]

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
        "title": story_title,
        "cover_image_url": cover_url,
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
    builder.add_node("character_verify", character_verify_node)
    builder.add_node("quiz_generator", quiz_generator_node)
    builder.add_node("assemble_result", assemble_result_node)

    builder.add_edge(START, "grade_setup")
    builder.add_edge("grade_setup", "story_writer")
    builder.add_edge("story_writer", "parse_story")
    builder.add_edge("parse_story", "image_prompt_gen")
    builder.add_edge("image_prompt_gen", "character_verify")
    builder.add_edge("character_verify", "quiz_generator")
    builder.add_edge("quiz_generator", "assemble_result")
    builder.add_edge("assemble_result", END)

    return builder.compile()


content_graph = build_content_graph()


async def run_content_agent(
    grade: int,
    theme: str,
    character_name: str,
    language: str = "english",
    art_style: str = "cartoon",
    character_description: Optional[str] = None,
    character_universe: Optional[str] = None,
    character_image_url: Optional[str] = None,
) -> dict:
    """Entry point — run the content generation graph."""

    # ── Auto-resolve gallery portrait URL from character name ─────────────────
    # If no portrait URL was provided, look it up in the gallery map.
    # This covers cases where the frontend sends only character_name.
    resolved_image_url = (character_image_url or "").strip()
    if not resolved_image_url:
        # Try exact name match first ("Blaze"), then key match ("hero_blaze")
        resolved_image_url = (
            CHAR_PORTRAIT_URLS.get(character_name)
            or CHAR_PORTRAIT_URLS.get(character_name.lower().replace(" ", "_"))
            or ""
        )
        if resolved_image_url:
            print(f"[run_content_agent] ✓ Auto-resolved portrait for '{character_name}': {resolved_image_url}")
        else:
            print(f"[run_content_agent] ⚠ No gallery portrait found for '{character_name}' — generating without reference")

    initial_state: ContentState = {
        "grade": grade,
        "theme": theme,
        "character_name": character_name,
        "character_description": character_description or "",
        "character_universe": character_universe or "",
        "character_visual": "",          # resolved by image_prompt_node
        "character_image_url": resolved_image_url,
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


# ── Phase 1: Fast path — text + cover only ───────────────────────────────────

async def run_content_agent_phase1(
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
    Phase 1 — generates ONLY story text + cover image.
    Page images are skipped so this returns in ~20-25s.
    Returns: { title, cover_image_url, character_visual, pages (no image_url), quiz_questions }
    """
    resolved_image_url = (character_image_url or "").strip()
    if not resolved_image_url:
        resolved_image_url = (
            CHAR_PORTRAIT_URLS.get(character_name)
            or CHAR_PORTRAIT_URLS.get(character_name.lower().replace(" ", "_"))
            or ""
        )

    state: ContentState = {
        "grade": grade,
        "theme": theme,
        "character_name": character_name,
        "character_description": character_description or "",
        "character_universe": character_universe or "",
        "character_visual": "",
        "character_image_url": resolved_image_url,
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

    # Run: grade_setup → story_writer → parse_story → quiz_generator → assemble_cover
    state = await grade_setup_node(state)
    state = await story_writer_node(state)
    state = await parse_story_node(state)
    state = await quiz_generator_node(state)
    # assemble cover only (no page images generated yet)
    state = await assemble_cover_node(state)

    return state["result"]


async def assemble_cover_node(state: ContentState) -> ContentState:
    """
    Lightweight version of assemble_result — generates ONLY the cover image.
    Page image_urls are left empty (null) — filled in by Phase 2.
    """
    pages = state["story_parsed"].get("pages", [])
    quiz_raw = state.get("quiz_questions", [])
    character_visual = state.get("character_visual") or state["character_name"]
    art_style = state.get("art_style", "cartoon")
    story_title = state["story_parsed"].get("title", f"{state['character_name']}'s Adventure")

    COVER_TEMPLATES = {
        "cartoon": (
            "Children's book cover illustration. "
            "HERO CHARACTER (large, centered, triumphant pose, full body): {cv}. "
            "Magical vibrant background themed around '{theme}', bright and inviting, "
            "celebratory composition, bold colors, storybook quality, no text, high resolution."
        ),
        "cinematic": (
            "Cinematic movie poster. NOT a cartoon. Photorealistic Hollywood style. "
            "HERO (dominating the frame, dramatic backlit, powerful pose): {cv}. "
            "Epic '{theme}' background, dramatic volumetric lighting, lens flare, film grain, IMAX quality, no text."
        ),
        "pixar": (
            "Pixar 3D animated film poster render. "
            "MAIN CHARACTER (large, joyful expressive pose, center): {cv}. "
            "Vibrant '{theme}' world in background, warm cinematic lighting, Pixar studio quality, no text, 8K."
        ),
        "real": (
            "Gritty photorealistic book cover. NOT a cartoon. "
            "HERO (intense gaze, powerful stance, photoreal): {cv}. "
            "Moody '{theme}' environment, dramatic lighting, DSLR quality, high contrast, no text."
        ),
        "comic": (
            "Marvel/DC comic book cover art. Dynamic composition. "
            "HERO (iconic costume, action pose, bold inks): {cv}. "
            "'{theme}' action background, halftone shading, vivid colors, no text overlay."
        ),
        "epic": (
            "Epic blockbuster movie poster, NOT a cartoon. "
            "HERO (god-tier heroic pose, massive scale, backlit by energy): {cv}. "
            "Explosive '{theme}' background, god rays, lens flares, cinematic grade, 8K ultra, no text."
        ),
    }

    preselected_cover = (state.get("character_image_url") or "").strip()
    if preselected_cover:
        print(f"[assemble_cover_node] Using gallery portrait as cover: {preselected_cover}")
        cover_url = preselected_cover
    else:
        cover_template = COVER_TEMPLATES.get(art_style, COVER_TEMPLATES["cartoon"])
        cover_prompt = cover_template.format(cv=character_visual, theme=state["theme"])
        print(f"[assemble_cover_node] Generating cover image...")
        cover_url = await _generate_image_nano_banana2(cover_prompt, art_style=art_style)
        print(f"[assemble_cover_node] Cover: {cover_url or 'FAILED'}")

    # Quiz mapping (same as assemble_result_node)
    quiz_questions = []
    for i, q in enumerate(quiz_raw):
        page_idx = q.get("page_index", min(i * 2 + 1, len(pages))) - 1
        quiz_questions.append({
            "story_page_id": f"__page_{page_idx}__",
            "question": q.get("question", ""),
            "choices": q.get("choices", []),
            "correct_answer": q.get("correct_answer", ""),
            "explanation": q.get("explanation", ""),
        })

    state["result"] = {
        "title": story_title,
        "cover_image_url": cover_url,
        "character_visual": character_visual,   # passed to Phase 2
        "character_image_url": state.get("character_image_url", ""),
        "pages": [
            {
                "page_number": p["page_number"],
                "content": p["content"],
                "image_url": None,   # filled by Phase 2
                "image_prompt": "",
            }
            for p in pages
        ],
        "quiz_questions": quiz_questions,
    }
    return state


# ── Phase 2: Background page image generation ─────────────────────────────────

async def run_content_agent_phase2(
    story_id: str,
    pages: list,
    character_visual: str,
    character_image_url: Optional[str],
    art_style: str,
    theme: str,
) -> None:
    """
    Phase 2 — generates all page images in parallel.
    As each image completes, updates the StoryPage.media_url in the DB.
    Runs as a FastAPI BackgroundTask — the HTTP response has already been sent.
    """
    from app.database import AsyncSessionLocal
    from app.models.story import StoryPage as StoryPageModel
    from sqlalchemy import update as sa_update

    char_ref_url = (character_image_url or "").strip() or None
    print(f"[phase2] Starting page image generation for story {story_id} — {len(pages)} pages")

    # Build image prompts (same logic as image_prompt_node)
    ART_STYLE_PROMPTS = {
        "cartoon": (
            "Children's book illustration. "
            "MAIN CHARACTER in foreground, full body visible, expressive face: {cv}. "
            "Scene: {scene}. "
            "Bright vivid colors, bold outlines, charming storybook atmosphere, whimsical, warm."
        ),
        "cinematic": (
            "Cinematic film still, dramatic camera angle, professional cinematography. "
            "HERO CHARACTER in foreground, dynamic pose, photorealistic detail: {cv}. "
            "Scene: {scene}. "
            "Volumetric lighting, film grain, dramatic shadows, high contrast, intense atmosphere."
        ),
        "pixar": (
            "3D animated film still, Pixar/Disney quality. "
            "MAIN CHARACTER in foreground, expressive 3D face, clay-like texture: {cv}. "
            "Scene: {scene}. "
            "Soft global illumination, magical lighting, depth of field, vibrant colors."
        ),
        "real": (
            "Photorealistic documentary photography, sharp and detailed. "
            "MAIN SUBJECT in foreground, intense focus, detailed skin and fabric: {cv}. "
            "Scene: {scene}. "
            "Natural lighting, high dynamic range, authentic textures, candid moment."
        ),
        "comic": (
            "Dynamic comic book splash page, bold and energetic. "
            "HERO CHARACTER in action pose, strong ink lines, clear design: {cv}. "
            "Scene: {scene}. "
            "Vivid primary colors, speed lines, high energy composition, professional comic art."
        ),
        "epic": (
            "Blockbuster movie poster, grand scale, heroic composition. "
            "HERO standing triumphant, glowing silhouette, epic presence: {cv}. "
            "Scene: {scene}. "
            "Atmospheric lighting, dramatic sky, cinematic scale, intense color grading."
        ),
    }
    PAGE_DIRECTION = [
        {"camera": "WIDE ESTABLISHING SHOT", "lighting": "bright morning sunlight", "mood": "wonder and excitement", "action": "character looking out at the world"},
        {"camera": "MEDIUM SHOT, character waist up", "lighting": "dramatic side lighting, golden hour", "mood": "tension rising", "action": "character reacting with surprise or determination"},
        {"camera": "DYNAMIC DUTCH ANGLE, low perspective", "lighting": "stormy dramatic sky", "mood": "high energy, urgent", "action": "character in full motion"},
        {"camera": "EXTREME CLOSE-UP on face", "lighting": "intense dramatic spotlight", "mood": "maximum drama", "action": "character's most powerful moment"},
        {"camera": "WIDE HERO SHOT, centered triumphant", "lighting": "warm golden sunset", "mood": "joy, victory", "action": "character celebrating"},
    ]

    style_template = ART_STYLE_PROMPTS.get(art_style, ART_STYLE_PROMPTS["cartoon"])

    async def _gen_and_save(page_data: dict, idx: int) -> None:
        direction = PAGE_DIRECTION[idx] if idx < len(PAGE_DIRECTION) else PAGE_DIRECTION[-1]
        scene_directive = (
            f"{direction['camera']}. Lighting: {direction['lighting']}. "
            f"Mood: {direction['mood']}. Action: {direction['action']}. "
            f"Story moment: {page_data['content'][:300]}"
        )
        prompt = style_template.format(cv=character_visual, scene=scene_directive)
        if len(prompt) > 900:
            prompt = prompt[:900]

        try:
            img_url = await _generate_image_nano_banana2(
                prompt, reference_image_url=char_ref_url, art_style=art_style
            )
            print(f"[phase2] Page {idx+1} image: {'OK ✓' if img_url else 'FAILED ✗'}")

            if img_url:
                async with AsyncSessionLocal() as db:
                    await db.execute(
                        sa_update(StoryPageModel)
                        .where(StoryPageModel.id == page_data["page_id"])
                        .values(media_url=img_url)
                    )
                    await db.commit()
                    print(f"[phase2] Page {idx+1} saved to DB ✓")
        except Exception as e:
            print(f"[phase2] Page {idx+1} generation failed: {e}")

    # Generate all pages in parallel — each saves to DB as it finishes
    await asyncio.gather(*[_gen_and_save(p, i) for i, p in enumerate(pages)])
    print(f"[phase2] ✓ All page images done for story {story_id}")
