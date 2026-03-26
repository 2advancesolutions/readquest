"""
Text-to-Speech router — Google Cloud Chirp 3: HD voices.

Chirp 3: HD is Google's latest generative TTS model with the most realistic,
emotionally resonant speech quality. Different voices are used per mode to
give each part of the app the right feel:

  story   → Aoede  (warm, engaging storyteller)
  teacher → Kore   (clear, encouraging, friendly)
  quiz    → Puck   (bright, enthusiastic, fun for kids)
  word    → Kore   (slow + clear pronunciation practice)
  default → Aoede  (warm natural)

Falls back to Gemini TTS (Kore voice) if the service account key is unavailable.
Both sync SDK calls run in run_in_executor(None) to stay async-safe in FastAPI.
"""
import asyncio
import struct
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.config import settings

router = APIRouter()

# ── Chirp 3: HD voice map per mode ─────────────────────────────────────────
CHIRP3_VOICE = {
    "story":   "en-US-Chirp3-HD-Aoede",   # warm, expressive storyteller
    "teacher": "en-US-Chirp3-HD-Kore",    # clear, friendly, encouraging
    "quiz":    "en-US-Chirp3-HD-Puck",    # bright, upbeat, fun for kids
    "word":    "en-US-Chirp3-HD-Kore",    # clear pronunciation
    "default": "en-US-Chirp3-HD-Aoede",   # warm natural
}

# Chirp 3 HD doesn't support speakingRate/pitch overrides —
# it's a generative model; prompt-style delivery is used instead.
# We use text prefixes to guide tone where needed (word mode).
WORD_PREFIX = "Say this word slowly and clearly so a child can repeat it: "

# ── Gemini fallback style prompts ────────────────────────────────────────────
GEMINI_STYLE = {
    "story":   "Read warmly as a friendly children's storyteller: ",
    "teacher": "Speak as a warm encouraging teacher for kids: ",
    "quiz":    "Speak cheerfully and enthusiastically for kids: ",
    "word":    "Say this word slowly and clearly for a child to repeat: ",
    "default": "Speak naturally and warmly: ",
}


class TTSRequest(BaseModel):
    text: str
    voice: str = "Chirp3-HD"   # ignored — mode drives voice selection
    mode: str = "default"


def _pcm_to_wav(pcm: bytes, rate: int = 24000, ch: int = 1, bits: int = 16) -> bytes:
    n = len(pcm)
    hdr = struct.pack("<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36+n, b"WAVE", b"fmt ", 16, 1, ch, rate,
        rate*ch*bits//8, ch*bits//8, bits, b"data", n)
    return hdr + pcm


def _chirp3_tts_sync(text: str, mode: str) -> bytes:
    """
    Google Cloud TTS — Chirp 3: HD voice.
    Uses the standard TextToSpeechClient (v1) with Chirp3-HD voice names.
    Auth via GOOGLE_APPLICATION_CREDENTIALS service account JSON.
    """
    from google.cloud import texttospeech
    from google.oauth2 import service_account

    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "gcloud-tts-key.json")
    if not os.path.isabs(key_path):
        key_path = str(Path(__file__).parent.parent.parent / key_path)

    if not os.path.exists(key_path):
        raise FileNotFoundError(f"Service account key not found: {key_path}")

    creds = service_account.Credentials.from_service_account_file(
        key_path,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    client = texttospeech.TextToSpeechClient(credentials=creds)

    # For 'word' mode, prefix the text so the model reads slowly and clearly
    input_text = text[:4500]
    if mode == "word":
        input_text = WORD_PREFIX + input_text

    synthesis_input = texttospeech.SynthesisInput(text=input_text)

    voice_name = CHIRP3_VOICE.get(mode, CHIRP3_VOICE["default"])
    voice = texttospeech.VoiceSelectionParams(
        language_code="en-US",
        name=voice_name,
    )

    # Chirp 3 HD supports MP3 output — use it for smaller payloads
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
    )

    response = client.synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )

    print(f"[TTS] ✅ Chirp3-HD ({voice_name}) | mode={mode} | {len(text)} chars")
    return response.audio_content


def _gemini_tts_sync(text: str, mode: str) -> bytes:
    """Synchronous Gemini TTS fallback — Kore voice."""
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

    # ── Primary: Google Cloud Chirp 3: HD ────────────────────────────────────
    try:
        audio = await loop.run_in_executor(None, _chirp3_tts_sync, text, req.mode)
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        print(f"[TTS] Chirp3-HD failed ({e}) → trying Gemini fallback")

    # ── Fallback: Gemini TTS (Kore voice) ────────────────────────────────────
    try:
        audio = await loop.run_in_executor(None, _gemini_tts_sync, text, req.mode)
        print(f"[TTS] ✅ Gemini Kore fallback | mode={req.mode}")
        return Response(content=audio, media_type="audio/wav")
    except Exception as e:
        print(f"[TTS] ❌ Both engines failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {str(e)}")
