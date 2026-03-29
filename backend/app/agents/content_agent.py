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
    character_description: str   # e.g. "blonde braided hair, ice-blue dress, ice powers"
    character_universe: str      # e.g. "Frozen (Disney)"
    character_visual: str        # resolved = "{name} from {universe} — {description}" used by every FLUX call
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

    prompt = f"""You are a brilliant children's book author writing for a Grade {grade} reading level.

Grade Level Writing Guide:
{vocab_desc}

Theme / Setting: {state['theme']}
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



async def _generate_image_nano_banana2(prompt: str) -> Optional[str]:
    """Generate a per-page illustration using fal.ai FLUX.1 [dev].

    Uses the higher-quality FLUX Dev model (28 steps, guidance_scale 3.5)
    for significantly better character likeness — Spider-Man, Disney, Pixar, etc.

    Returns a Supabase public URL or local /static/images/<uuid>.png path, or None on failure.
    """
    import os

    fal_key = settings.FAL_AI or os.environ.get("FAL_AI", "")
    if not fal_key:
        print("[fal.ai] No FAL_AI key — skipping image generation")
        return None

    STATIC_DIR.mkdir(parents=True, exist_ok=True)

    # Truncate very long prompts (fal.ai handles most content fine, no aggressive filters)
    image_prompt = prompt[:500]

    try:
        import fal_client
        # Set the key via env var (fal_client reads FAL_KEY or FAL_KEY_ID:FAL_KEY_SECRET)
        os.environ["FAL_KEY"] = fal_key

        print(f"[fal.ai] Generating image with FLUX.1 [dev] (high-quality)...")
        result = await asyncio.to_thread(
            fal_client.subscribe,
            "fal-ai/flux/dev",
            arguments={
                "prompt": image_prompt,
                "image_size": "square_hd",       # 1024×1024
                "num_inference_steps": 28,        # dev default — much higher quality
                "guidance_scale": 3.5,            # stronger prompt adherence for characters
                "num_images": 1,
                "enable_safety_checker": True,
                "output_format": "png",           # lossless for Supabase upload
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
    Flood-fills from all 4 corners to identify background white pixels,
    converts them to transparent — perfect for flat cartoon illustrations.
    Returns PNG bytes with a transparent background.
    Falls back to the original bytes if anything fails.
    """
    def _do_remove(data: bytes) -> bytes:
        from PIL import Image
        import io
        import numpy as np

        img = Image.open(io.BytesIO(data)).convert("RGBA")
        arr = np.array(img)

        # White-ish threshold — pixels where all RGB channels > 220 are "background"
        r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
        white_mask = (r > 220) & (g > 220) & (b > 220)

        # Flood fill from all 4 corners to get ONLY connected white background
        # (avoids removing white pixels that are part of the character)
        from PIL import ImageDraw
        h, w = arr.shape[:2]
        flood_mask = np.zeros((h, w), dtype=bool)

        # Use PIL's flood-fill by converting to L mode for speed
        gray = img.convert("L")
        gray_arr = np.array(gray)

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

        # Make flooded pixels transparent
        arr[flood_mask, 3] = 0

        # Soft edge feathering — slightly fade near-white border pixels
        near_white = (r > 200) & (g > 200) & (b > 200) & (~flood_mask)
        brightness = (r[near_white].astype(float) + g[near_white].astype(float) + b[near_white].astype(float)) / 3.0
        alpha_scale = np.clip((255.0 - brightness) / 35.0, 0.0, 1.0)
        arr[near_white, 3] = (arr[near_white, 3] * alpha_scale).astype(np.uint8)

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
    FLUX-all-the-way image pipeline.
    1. Resolves a rich character_visual string (from provided description or Gemini auto-enrich).
    2. Saves character_visual to state so every downstream node uses the SAME description.
    3. Builds per-page prompts with the character as the MANDATORY main subject.
    4. Generates ALL page images in parallel via FLUX.1 Dev for consistency and speed.
    """
    pages = state["story_parsed"].get("pages", [])
    art_style = state.get('art_style', 'cartoon')
    char = state['character_name']
    theme = state['theme']

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

    # Save to state so character_verify and assemble_result can reuse the same description
    state["character_visual"] = character_visual
    print(f"[image_prompt_node] ✓ character_visual: {character_visual}")

    # ── Style-specific FLUX prompt templates ──────────────────────────────────────────────
    # Pattern: [STYLE DECLARATION] + [CHARACTER AS MANDATORY FOREGROUND SUBJECT] + [SCENE] + [STYLE DETAILS]
    ART_STYLE_PROMPTS = {
        "cartoon": (
            "Fun 2D illustrated children's book, colorful cartoon page spread. "
            "CHARACTER (prominently centered foreground, full body, clearly recognizable): {cv}. "
            "Scene context: {scene}. "
            "Bold black outlines, flat cel-shaded colors, bright saturation, modern cartoon sticker art, "
            "safe for kids, no text, high resolution."
        ),
        "cinematic": (
            "ULTRA-REALISTIC CINEMATIC LIVE-ACTION PHOTOGRAPH — NOT a cartoon, NOT animated, NOT illustrated. "
            "Hollywood 4K IMAX cinematography, photorealistic detail, anamorphic film grain. "
            "HERO IN FOREGROUND (large, dynamic action pose, unmistakably recognizable): {cv}. "
            "Scene action: {scene}. "
            "Dramatic volumetric light beams, depth-of-field bokeh background, motion blur on action, "
            "storm atmosphere, emergency lighting, sun breaking through clouds, DSLR 28mm lens, ultrasharp."
        ),
        "pixar": (
            "Pixar/Illumination 3D CGI film render, vibrant studio-quality animation — NOT a flat 2D cartoon. "
            "MAIN CHARACTER (large foreground, expressive face, mid-action dynamic pose): {cv}. "
            "Scene: {scene}. "
            "Subsurface scattering skin shading, soft global illumination, cinematic depth of field, "
            "highly detailed Pixar textures, exaggerated expressive motion, magical particle effects, 8K render."
        ),
        "real": (
            "GRITTY PHOTOREALISTIC LIVE-ACTION PHOTOGRAPHY — absolutely NOT a cartoon, NOT illustrated, NOT animated. "
            "Real-world photojournalism, hyperrealistic detail, documentary style. "
            "MAIN CHARACTER (intense expression, foreground center, unmistakably recognizable): {cv}. "
            "Scene: {scene}. "
            "Wet pavement reflections, rain and sparks, nighttime urban grit, bokeh city lights, "
            "DSLR 85mm f/1.8, shallow depth of field, high contrast, photorealistic fabric and skin texture, "
            "8K ultra-sharp photography, zero illustration elements."
        ),
        "comic": (
            "Dynamic Marvel/DC graphic novel comic book art, high-energy panel composition — NOT photorealistic. "
            "MAIN CHARACTER (action foreground, bold thick ink outlines, iconic costume detail): {cv}. "
            "Panel scene: {scene}. "
            "Vivid halftone dot shading, ben-day dots, bold primary colors, speed lines, foreshortening, "
            "impact burst energy effects integrated as art, Marvel/DC quality inking, no text overlay."
        ),
        "epic": (
            "Blockbuster IMAX movie poster / key art, ultra-cinematic photorealistic scale — NOT a cartoon. "
            "HERO (center stage, heroic stance, dramatic backlit silhouette, massive imposing scale): {cv}. "
            "Scene: {scene}. "
            "Catastrophic background destruction, explosions, collapsing skyline, helicopters, storm clouds, "
            "bio-electric energy burst in brilliant blue-white, golden-hour sunset mixing with electric glow, "
            "lens flares, volumetric god rays, cinematic color grade, movie poster composition, 8K ultra."
        ),
    }
    style_template = ART_STYLE_PROMPTS.get(art_style, ART_STYLE_PROMPTS['cartoon'])

    # ── Build per-page prompts ────────────────────────────────────────────────────────────
    prompts = []
    for page in pages:
        scene = (
            f"{page['content'][:200]}. "
            f"Setting/theme: {theme}. "
            f"Grade {state['grade']} children's book."
        )
        prompt = style_template.format(cv=character_visual, scene=scene)
        prompts.append(prompt)
    state["image_prompts"] = prompts
    print(f"[image_prompt_node] Generating {len(prompts)} page images via FLUX in parallel...")

    # ── Generate ALL page images in parallel via FLUX.1 Dev ──────────────────────────────
    tasks = [_generate_image_nano_banana2(p) for p in prompts]
    image_urls = list(await asyncio.gather(*tasks, return_exceptions=True))
    # Replace exceptions with None so the pipeline doesn't die on partial failures
    image_urls = [u if isinstance(u, str) else None for u in image_urls]
    print(f"[image_prompt_node] FLUX done: {sum(1 for u in image_urls if u)} / {len(image_urls)} images OK")
    state["image_urls"] = image_urls
    return state


async def character_verify_node(state: ContentState) -> ContentState:
    """Verify each page image contains the selected character; regenerate failures via FLUX using full character_visual."""
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

    regen_tasks = {}
    for page_idx in failed_indexes:
        page_content = pages[page_idx]['content'][:180] if page_idx < len(pages) else ""
        regen_prompt = REGEN_TEMPLATE.format(
            style_decl=style_decl,
            cv=character_visual,
            scene=page_content,
            theme=state['theme'],
        )
        print(f"[character_verify] Queuing FLUX regen for page {page_idx+1}...")
        regen_tasks[page_idx] = _generate_image_nano_banana2(regen_prompt)

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
    """Assemble the final story result — generates a dedicated FLUX cover image."""
    pages = state["story_parsed"].get("pages", [])
    quiz_raw = state.get("quiz_questions", [])
    character_visual = state.get('character_visual') or state['character_name']
    art_style = state.get('art_style', 'cartoon')
    story_title = state["story_parsed"].get("title", f"{state['character_name']}'s Adventure")

    # ── Generate a dedicated FLUX cover image (hero portrait shoot) ─────────────
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
    cover_template = COVER_TEMPLATES.get(art_style, COVER_TEMPLATES['cartoon'])
    cover_prompt = cover_template.format(cv=character_visual, theme=state['theme'])

    print(f"[assemble_result_node] Generating FLUX cover image...")
    cover_url = await _generate_image_nano_banana2(cover_prompt)
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
) -> dict:
    """Entry point — run the content generation graph."""
    initial_state: ContentState = {
        "grade": grade,
        "theme": theme,
        "character_name": character_name,
        "character_description": character_description or "",
        "character_universe": character_universe or "",
        "character_visual": "",          # resolved by image_prompt_node, used by all downstream nodes
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
