"""
Movie Studio for Kids — FastAPI router
Endpoints: generate-frame, create-video, tokens, purchase-tokens
"""
import asyncio
import os
import uuid
import httpx
from fastapi import APIRouter, Header
from pydantic import BaseModel
from typing import Optional

from app.config import settings

router = APIRouter()

# ── Storage config ────────────────────────────────────────────────────────────
SUPABASE_URL = "https://nspehtlzknfbiwvjswge.supabase.co"
SUPABASE_BUCKET_VIDEOS = "movie-studio-videos"
SUPABASE_SERVICE_KEY = getattr(settings, "SUPABASE_SERVICE_KEY", "") or getattr(settings, "SUPABASE_ANON_KEY", "")
BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "http://localhost:8000")

# ── In-memory token store (replace with DB in production) ─────────────────────
# { student_id: { tokens_used: int, tokens_total: int } }
_token_store: dict = {}

FREE_TOKENS = 10
PURCHASE_TOKENS = 10


def _get_tokens(student_id: str) -> dict:
    if student_id not in _token_store:
        _token_store[student_id] = {"tokens_used": 0, "tokens_total": FREE_TOKENS}
    return _token_store[student_id]


# ── Schemas ────────────────────────────────────────────────────────────────────
class GenerateFrameRequest(BaseModel):
    prompt: str
    frame_index: int = 0


class CreateVideoRequest(BaseModel):
    image_urls: list[str]
    student_id: Optional[str] = None


class PurchaseTokensRequest(BaseModel):
    student_id: str
    package: str = "10_pack"


# ── Helpers ────────────────────────────────────────────────────────────────────
async def _upload_video_to_supabase(video_bytes: bytes, filename: str) -> Optional[str]:
    """Upload video bytes to Supabase Storage 'movie-studio-videos' bucket."""
    if not SUPABASE_SERVICE_KEY:
        return None
    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET_VIDEOS}/{filename}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "video/mp4",
        "x-upsert": "true",
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(upload_url, content=video_bytes, headers=headers)
            if resp.status_code in (200, 201):
                return f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET_VIDEOS}/{filename}"
            print(f"[movie-studio] Supabase video upload failed: {resp.status_code} {resp.text[:200]}")
            return None
    except Exception as e:
        print(f"[movie-studio] Supabase upload error: {e}")
        return None


async def _generate_frame_image(prompt: str) -> Optional[str]:
    """Generate a single frame image using FLUX Dev via fal.ai."""
    fal_key = settings.FAL_AI or os.environ.get("FAL_AI", "")
    if not fal_key:
        return None

    try:
        import fal_client
        os.environ["FAL_KEY"] = fal_key

        # Enhance prompt for cinematic storybook style
        enhanced_prompt = (
            f"MASTERPIECE, 8K, extremely detailed, {prompt[:450]}. "
            "Cinematic children's storybook illustration, vibrant colors, "
            "sharp focus, professional lighting, safe for kids, no text, high quality."
        )

        result = await asyncio.to_thread(
            fal_client.subscribe,
            "fal-ai/flux/dev",
            arguments={
                "prompt": enhanced_prompt[:500],
                "image_size": "landscape_4_3",   # 16:9-ish for cinematic look
                "num_inference_steps": 28,
                "guidance_scale": 4.5,
                "num_images": 1,
                "enable_safety_checker": True,
                "output_format": "png",
            },
        )

        images = result.get("images", [])
        if not images:
            return None

        fal_url = images[0].get("url")
        if not fal_url:
            return None

        # Download and re-upload to Supabase for persistence
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(fal_url)
            if resp.status_code != 200:
                return None
            img_bytes = resp.content

        from app.agents.content_agent import _upload_to_supabase
        filename = f"studio_frame_{uuid.uuid4().hex}.png"
        public_url = await _upload_to_supabase(img_bytes, filename)
        return public_url or fal_url

    except Exception as e:
        print(f"[movie-studio] Frame generation error: {e}")
        return None


async def _animate_image_to_video(image_url: str, frame_number: int) -> Optional[str]:
    """Convert a single image to a short video clip via MiniMax Hailuo on fal.ai."""
    fal_key = settings.FAL_AI or os.environ.get("FAL_AI", "")
    if not fal_key:
        return None

    motion_prompts = [
        "Gentle camera zoom in, soft ambient motion, leaves rustling, magical atmosphere",
        "Slow pan left to right, characters slightly moving, cinematic drift",
        "Subtle parallax depth, foreground elements swaying, dreamy motion",
        "Gentle camera pull back, environment alive with small movements, warm glow",
        "Soft camera drift upward, final scene breathes gently, triumphant feeling",
    ]
    motion = motion_prompts[frame_number % len(motion_prompts)]

    try:
        import fal_client
        os.environ["FAL_KEY"] = fal_key

        print(f"[movie-studio] Animating frame {frame_number + 1} via MiniMax Hailuo...")
        result = await asyncio.to_thread(
            fal_client.subscribe,
            "fal-ai/minimax/hailuo-02/standard/image-to-video",
            arguments={
                "prompt": f"Children's storybook animation. {motion}. Safe for kids, wholesome, no text.",
                "image_url": image_url,
            },
        )

        video_url = result.get("video", {}).get("url") or result.get("url")
        if not video_url:
            # Try different response shapes
            if isinstance(result, dict):
                for key in ("video_url", "output", "result"):
                    val = result.get(key)
                    if isinstance(val, str) and val.startswith("http"):
                        video_url = val
                        break
                    if isinstance(val, dict):
                        video_url = val.get("url")
                        if video_url:
                            break

        print(f"[movie-studio] Frame {frame_number + 1} video URL: {video_url}")
        return video_url

    except Exception as e:
        print(f"[movie-studio] Animation error for frame {frame_number}: {e}")
        return None


async def _stitch_videos(video_urls: list[str]) -> Optional[bytes]:
    """
    Download all video clips, concatenate them into one mp4 using ffmpeg.
    Returns the final mp4 bytes, or None on failure.
    """
    import tempfile
    import subprocess
    from pathlib import Path

    # Download all clips
    clips = []
    async with httpx.AsyncClient(timeout=60) as client:
        for i, url in enumerate(video_urls):
            if not url:
                continue
            try:
                resp = await client.get(url)
                if resp.status_code == 200:
                    clips.append((i, resp.content))
                    print(f"[movie-studio] Downloaded clip {i + 1}: {len(resp.content)} bytes")
            except Exception as e:
                print(f"[movie-studio] Failed to download clip {i}: {e}")

    if not clips:
        return None

    # Write clips to temp dir and stitch with ffmpeg
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        filelist = tmp / "filelist.txt"
        lines = []

        for idx, (i, data) in enumerate(clips):
            clip_path = tmp / f"clip_{idx:02d}.mp4"
            clip_path.write_bytes(data)
            lines.append(f"file '{clip_path}'")

        filelist.write_text("\n".join(lines))
        output_path = tmp / "movie.mp4"

        # Try ffmpeg first (best quality concat)
        try:
            subprocess.run(
                [
                    "ffmpeg", "-y",
                    "-f", "concat",
                    "-safe", "0",
                    "-i", str(filelist),
                    "-c", "copy",
                    str(output_path),
                ],
                capture_output=True,
                timeout=120,
                check=True,
            )
            if output_path.exists():
                result = output_path.read_bytes()
                print(f"[movie-studio] Stitched video: {len(result)} bytes")
                return result
        except subprocess.CalledProcessError as e:
            print(f"[movie-studio] ffmpeg error: {e.stderr.decode()[:500]}")
        except FileNotFoundError:
            # ffmpeg not installed — concatenate raw bytes as best effort
            # This creates a valid playable file for the first clip while we wait for ffmpeg
            print("[movie-studio] ffmpeg not found — concatenating all clip bytes directly")
            combined = b"".join(data for _, data in clips)
            return combined

    return None


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate-frame")
async def generate_frame(
    req: GenerateFrameRequest,
    x_student_id: Optional[str] = Header(default=None),
):
    """Generate a single storyboard frame image via FLUX Dev."""
    student_id = x_student_id or "guest"

    if not req.prompt.strip():
        return {"frame_index": req.frame_index, "image_url": None, "error": "Prompt is required"}

    print(f"[movie-studio] Generating frame {req.frame_index} for student {student_id}")
    image_url = await _generate_frame_image(req.prompt)

    return {
        "frame_index": req.frame_index,
        "image_url": image_url,
        "success": image_url is not None,
    }


@router.post("/create-video")
async def create_video(
    req: CreateVideoRequest,
    x_student_id: Optional[str] = Header(default=None),
):
    """
    Animate all 5 frame images, stitch into one video, upload to Supabase.
    Decrements the student's token balance.
    """
    student_id = req.student_id or x_student_id or "guest"

    # Check token balance
    tokens = _get_tokens(student_id)
    remaining = tokens["tokens_total"] - tokens["tokens_used"]
    if remaining <= 0:
        return {
            "success": False,
            "error": "No tokens remaining. Purchase more to continue.",
            "tokens_remaining": 0,
        }

    valid_urls = [u for u in req.image_urls if u and u.startswith("http")]
    if not valid_urls:
        return {"success": False, "error": "No valid image URLs provided", "tokens_remaining": remaining}

    print(f"[movie-studio] Creating video for student {student_id} with {len(valid_urls)} frames")

    # Animate each frame concurrently
    animation_tasks = [
        _animate_image_to_video(url, i) for i, url in enumerate(req.image_urls)
    ]
    video_clips = await asyncio.gather(*animation_tasks, return_exceptions=True)
    video_urls = [
        v if isinstance(v, str) else None
        for v in video_clips
    ]

    # Stitch clips together
    final_bytes = await _stitch_videos([u for u in video_urls if u])

    if not final_bytes:
        return {
            "success": False,
            "error": "Video stitching failed. Please try again.",
            "tokens_remaining": remaining,
        }

    # Upload to Supabase
    filename = f"studio_{student_id[:8]}_{uuid.uuid4().hex[:8]}.mp4"
    video_url = await _upload_video_to_supabase(final_bytes, filename)

    # If Supabase upload fails, save locally as fallback
    if not video_url:
        from pathlib import Path
        Path("static/videos").mkdir(parents=True, exist_ok=True)
        Path(f"static/videos/{filename}").write_bytes(final_bytes)
        # Return fully-qualified URL so the browser can reach it
        video_url = f"{BACKEND_BASE_URL}/static/videos/{filename}"

    # Deduct token
    tokens["tokens_used"] += 1
    new_remaining = tokens["tokens_total"] - tokens["tokens_used"]

    print(f"[movie-studio] ✅ Video created: {video_url} | Tokens remaining: {new_remaining}")

    return {
        "success": True,
        "video_url": video_url,
        "tokens_remaining": new_remaining,
        "tokens_used": tokens["tokens_used"],
    }


@router.get("/tokens")
async def get_tokens(x_student_id: Optional[str] = Header(default=None)):
    """Return this student's token balance."""
    student_id = x_student_id or "guest"
    tokens = _get_tokens(student_id)
    remaining = tokens["tokens_total"] - tokens["tokens_used"]
    return {
        "tokens_used": tokens["tokens_used"],
        "tokens_total": tokens["tokens_total"],
        "tokens_remaining": remaining,
    }


@router.post("/purchase-tokens")
async def purchase_tokens(req: PurchaseTokensRequest):
    """
    Add 10 tokens to the student's balance.
    V1: no real payment — mock purchase.
    V2: integrate Stripe before going live.
    """
    tokens = _get_tokens(req.student_id)
    tokens["tokens_total"] += PURCHASE_TOKENS
    remaining = tokens["tokens_total"] - tokens["tokens_used"]
    print(f"[movie-studio] Token purchase for {req.student_id}: +{PURCHASE_TOKENS} → {remaining} remaining")
    return {
        "success": True,
        "tokens_added": PURCHASE_TOKENS,
        "tokens_remaining": remaining,
        "tokens_total": tokens["tokens_total"],
        "price_paid": 15.00,
    }
