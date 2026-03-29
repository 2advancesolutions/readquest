"""
Speech-to-Text router — server-side transcription via Gemini.

Receives audio (webm/wav/mp3) from the frontend's MediaRecorder,
sends it to Gemini for transcription, and returns the text.

This bypasses ALL browser SpeechRecognition restrictions:
 - Works in Chrome on iOS (where webkitSpeechRecognition is blocked)
 - Works in every browser that supports MediaRecorder (all modern ones)
 - No native app required
"""
import asyncio
import base64
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from app.config import settings

router = APIRouter()


def _transcribe_sync(audio_bytes: bytes, mime_type: str, lang: str) -> str:
    """Synchronous Gemini transcription — runs in executor."""
    from google import genai as _genai
    from google.genai import types as _gt

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("No GEMINI_API_KEY configured")

    client = _genai.Client(api_key=api_key)

    # Build the prompt based on language
    lang_hint = ""
    if lang and lang != "en-US":
        lang_hint = f" The audio is in {lang}."

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            _gt.Content(parts=[
                _gt.Part(text=(
                    f"Transcribe the following audio exactly as spoken. "
                    f"Return ONLY the transcribed text, nothing else. "
                    f"Do not add punctuation unless clearly present in speech. "
                    f"Do not add commentary or labels.{lang_hint}"
                )),
                _gt.Part(inline_data=_gt.Blob(
                    mime_type=mime_type,
                    data=audio_bytes,
                )),
            ]),
        ],
    )

    text = response.text.strip() if response.text else ""
    print(f"[STT] ✅ Transcribed {len(audio_bytes)} bytes → '{text[:80]}...'")
    return text


@router.post("/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    lang: str = Form("en-US"),
):
    """Accept audio file, return transcription text."""
    audio_bytes = await audio.read()

    if len(audio_bytes) < 100:
        raise HTTPException(400, "Audio too short")

    if len(audio_bytes) > 25 * 1024 * 1024:  # 25 MB limit
        raise HTTPException(413, "Audio file too large (max 25MB)")

    # Determine MIME type
    ct = audio.content_type or "audio/webm"
    # Normalize common types
    mime_map = {
        "audio/webm": "audio/webm",
        "audio/webm;codecs=opus": "audio/webm",
        "audio/mp4": "audio/mp4",
        "audio/wav": "audio/wav",
        "audio/mpeg": "audio/mpeg",
        "audio/ogg": "audio/ogg",
        "audio/ogg;codecs=opus": "audio/ogg",
    }
    mime_type = mime_map.get(ct, "audio/webm")

    loop = asyncio.get_running_loop()
    try:
        text = await loop.run_in_executor(None, _transcribe_sync, audio_bytes, mime_type, lang)
        return JSONResponse({"text": text, "lang": lang})
    except Exception as e:
        print(f"[STT] ❌ Transcription failed: {e}")
        raise HTTPException(500, f"Transcription failed: {str(e)}")
