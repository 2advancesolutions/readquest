"""
Text-to-Speech router.

Primary:  Google Cloud TTS Neural2 (en-US-Neural2-F) — warm human female voice
Fallback: Gemini TTS (Kore voice)

Both run their sync SDK calls in run_in_executor(None) so they work correctly
inside FastAPI's async handlers without event-loop conflicts.
"""
import asyncio
import json
import base64
import struct
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.config import settings

router = APIRouter()

# ── Voice / audio config ────────────────────────────────────────────────────
VOICE_NAME    = "en-US-Neural2-F"   # warm natural female
SPEAKING_RATE = {"story": 0.90, "teacher": 0.95, "quiz": 1.00, "word": 0.75, "default": 0.93}
PITCH_MAP     = {"story": 1.5,  "teacher": 2.0,  "quiz":  3.0, "word": 1.0,  "default": 1.5}

GEMINI_STYLE = {
    "story":   "Read warmly as a friendly children's storyteller: ",
    "teacher": "Speak as a warm encouraging teacher for kids: ",
    "quiz":    "Speak cheerfully and enthusiastically for kids: ",
    "word":    "Say this word slowly and clearly for a child to repeat: ",
    "default": "Speak naturally and warmly: ",
}


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-Neural2-F"
    mode: str = "default"


def _pcm_to_wav(pcm: bytes, rate: int = 24000, ch: int = 1, bits: int = 16) -> bytes:
    n = len(pcm)
    hdr = struct.pack("<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36+n, b"WAVE", b"fmt ", 16, 1, ch, rate,
        rate*ch*bits//8, ch*bits//8, bits, b"data", n)
    return hdr + pcm


def _gcloud_tts_sync(text: str, mode: str) -> bytes:
    """Synchronous Google Cloud TTS REST call — safe to run in executor."""
    import requests as req_lib
    from google.oauth2 import service_account
    from google.auth.transport.requests import Request as GReq

    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "gcloud-tts-key.json")
    if not os.path.isabs(key_path):
        key_path = str(Path(__file__).parent.parent.parent / key_path)

    creds = service_account.Credentials.from_service_account_file(
        key_path, scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(GReq())

    payload = {
        "input": {"text": text[:4500]},
        "voice": {"languageCode": "en-US", "name": VOICE_NAME},
        "audioConfig": {
            "audioEncoding": "MP3",
            "speakingRate": SPEAKING_RATE.get(mode, 0.93),
            "pitch": PITCH_MAP.get(mode, 1.5),
            "effectsProfileId": ["large-home-entertainment-class-device"],
        },
    }
    r = req_lib.post(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"},
        data=json.dumps(payload),
        timeout=20,
    )
    r.raise_for_status()
    return base64.b64decode(r.json()["audioContent"])


def _gemini_tts_sync(text: str, mode: str) -> bytes:
    """Synchronous Gemini TTS call — safe to run in executor."""
    from google import genai as _genai
    from google.genai import types as _gt

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise RuntimeError("No GEMINI_API_KEY")

    full_text = GEMINI_STYLE.get(mode, GEMINI_STYLE["default"]) + text[:4500]
    client = _genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model="gemini-2.5-flash-preview-tts",
        contents=full_text,
        config=_gt.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=_gt.SpeechConfig(
                voice_config=_gt.VoiceConfig(
                    prebuilt_voice_config=_gt.PrebuiltVoiceConfig(voice_name="Kore")
                )
            ),
        ),
    )
    part = response.candidates[0].content.parts[0]
    audio = part.inline_data.data
    mime  = part.inline_data.mime_type or ""
    if "l16" in mime.lower() or "pcm" in mime.lower() or not mime.startswith("audio/wav"):
        rate = 24000
        if "rate=" in mime:
            try: rate = int(mime.split("rate=")[1].split(";")[0].strip())
            except: pass
        audio = _pcm_to_wav(audio, rate)
    return audio


@router.post("/speak", response_class=Response)
async def speak(req: TTSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text is required")

    loop = asyncio.get_running_loop()

    # ── Primary: Google Cloud TTS Neural2 ───────────────────────────────────
    try:
        audio = await loop.run_in_executor(None, _gcloud_tts_sync, text, req.mode)
        print(f"[TTS] ✅ Google Cloud Neural2 | mode={req.mode} | {len(text)} chars")
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        print(f"[TTS] Google Cloud failed ({e}) → trying Gemini fallback")

    # ── Fallback: Gemini TTS ─────────────────────────────────────────────────
    try:
        audio = await loop.run_in_executor(None, _gemini_tts_sync, text, req.mode)
        print(f"[TTS] ✅ Gemini Kore fallback | mode={req.mode}")
        return Response(content=audio, media_type="audio/wav")
    except Exception as e:
        print(f"[TTS] ❌ Both engines failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {str(e)}")
