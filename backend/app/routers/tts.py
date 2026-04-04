"""
Text-to-Speech router — Google Cloud Studio / Journey / Wavenet voices.

All voices are female. Two distinct characters:

  story / quiz-fb / default → Studio-F  (warm, rich female storyteller)
  teacher / quiz-q / word   → Journey-F  (conversational, upbeat female)

Timed endpoint (speak-timed with SSML marks):
  story / quiz-fb / default → Wavenet-A  (female, warm)
  teacher / word            → Wavenet-F  (female, clear)
  quiz-q                    → Wavenet-C  (female, bright/energetic)

Falls back to Gemini TTS (Aoede voice — female) if the service account key is unavailable.
"""
import asyncio
import struct
import os
import re
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from app.config import settings

router = APIRouter()

# ── Journey voice map per mode ──────────────────────────────────────────────
NEURAL_VOICE = {
    "story":   "en-US-Neural2-F",  # Google's natural female storyteller voice
    "teacher": "en-US-Journey-F",  # conversational female teacher
    "quiz":    "en-US-Neural2-F",  # warm natural female quiz feedback
    "quiz-q":  "en-US-Neural2-C",  # bright energetic female question reader
    "word":    "en-US-Journey-F",
    "default": "en-US-Neural2-F",
}

NEURAL_RATE = {
    "story":   0.90,
    "teacher": 0.92,
    "quiz":    1.00,
    "quiz-q":  1.05,   # slightly faster = more upbeat/energetic
    "word":    0.78,
    "default": 0.92,
}

VOLUME_GAIN_DB = 6.0

GEMINI_STYLE = {
    "story":   "Read warmly as a friendly children's storyteller: ",
    "teacher": "Speak as a warm encouraging teacher for kids: ",
    "quiz":    "Speak cheerfully and enthusiastically for kids: ",
    "quiz-q":  "Ask this question in an upbeat, exciting, game-show style for kids: ",
    "word":    "Say this word slowly and clearly for a child to repeat: ",
    "default": "Speak naturally and warmly: ",
}


class TTSRequest(BaseModel):
    text: str
    voice: str = "Chirp3-HD"
    mode: str = "default"


def _pcm_to_wav(pcm: bytes, rate: int = 24000, ch: int = 1, bits: int = 16) -> bytes:
    n = len(pcm)
    hdr = struct.pack("<4sI4s4sIHHIIHH4sI",
        b"RIFF", 36+n, b"WAVE", b"fmt ", 16, 1, ch, rate,
        rate*ch*bits//8, ch*bits//8, bits, b"data", n)
    return hdr + pcm


def _get_tts_client():
    """Create a Google Cloud TTS client from service account credentials."""
    from google.cloud import texttospeech
    from google.oauth2 import service_account

    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "gcloud-tts-key.json")
    if not os.path.isabs(key_path):
        key_path = str(Path(__file__).parent.parent.parent / key_path)
    if not os.path.exists(key_path):
        raise FileNotFoundError(f"Service account key not found: {key_path}")

    creds = service_account.Credentials.from_service_account_file(
        key_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    return texttospeech.TextToSpeechClient(credentials=creds)


def _neural_tts_sync(text: str, mode: str) -> bytes:
    """Standard Google Cloud TTS — no timepoints."""
    from google.cloud import texttospeech

    client = _get_tts_client()
    synthesis_input = texttospeech.SynthesisInput(text=text[:4500])
    voice_name = NEURAL_VOICE.get(mode, NEURAL_VOICE["default"])
    voice = texttospeech.VoiceSelectionParams(language_code="en-US", name=voice_name)
    speaking_rate = NEURAL_RATE.get(mode, 0.92)
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=speaking_rate,
        volume_gain_db=VOLUME_GAIN_DB,
        pitch=0.0,
    )

    response = client.synthesize_speech(
        input=synthesis_input, voice=voice, audio_config=audio_config
    )
    print(f"[TTS] Neural2/Studio ({voice_name}) | mode={mode} | rate={speaking_rate} | {len(text)} chars")
    return response.audio_content


def _neural_tts_timed_sync(text: str, mode: str) -> tuple:
    """
    Google Cloud TTS with SSML <mark> tags for word-level timepoints.
    Uses v1beta1 API which supports enable_time_pointing (v1 returns empty).
    Returns (audio_bytes, timepoints) where timepoints is a list of
    {"word": index, "time": seconds} for each word.
    """
    from google.cloud import texttospeech_v1beta1 as tts_beta
    from google.oauth2 import service_account

    key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "gcloud-tts-key.json")
    if not os.path.isabs(key_path):
        key_path = str(Path(__file__).parent.parent.parent / key_path)
    if not os.path.exists(key_path):
        raise FileNotFoundError(f"Service account key not found: {key_path}")

    creds = service_account.Credentials.from_service_account_file(
        key_path, scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    client = tts_beta.TextToSpeechClient(credentials=creds)

    # Split text into tokens (words + whitespace) and wrap each word with <mark>
    tokens = re.split(r'(\s+)', text[:4500])
    ssml_parts = []
    word_idx = 0
    for token in tokens:
        if token.strip():
            ssml_parts.append(f'<mark name="w{word_idx}"/>{token}')
            word_idx += 1
        else:
            ssml_parts.append(token)

    ssml = f'<speak>{"".join(ssml_parts)}</speak>'

    synthesis_input = tts_beta.SynthesisInput(ssml=ssml)
    # Journey voices don't support SSML marks — use Wavenet (high quality + timepoints)
    TIMED_VOICE = {
        "story":   "en-US-Wavenet-F",  # female, natural
        "teacher": "en-US-Wavenet-F",
        "quiz":    "en-US-Wavenet-F",  # female quiz feedback
        "quiz-q":  "en-US-Wavenet-C",  # bright female question reader
        "word":    "en-US-Wavenet-F",
        "default": "en-US-Wavenet-F",
    }
    voice_name = TIMED_VOICE.get(mode, TIMED_VOICE["default"])
    voice_params = tts_beta.VoiceSelectionParams(language_code="en-US", name=voice_name)
    speaking_rate = NEURAL_RATE.get(mode, 0.92)
    audio_config = tts_beta.AudioConfig(
        audio_encoding=tts_beta.AudioEncoding.MP3,
        speaking_rate=speaking_rate,
        volume_gain_db=VOLUME_GAIN_DB,
        pitch=0.0,
    )

    request = tts_beta.SynthesizeSpeechRequest(
        input=synthesis_input,
        voice=voice_params,
        audio_config=audio_config,
        enable_time_pointing=[
            tts_beta.SynthesizeSpeechRequest.TimepointType.SSML_MARK
        ],
    )
    response = client.synthesize_speech(request=request)

    # Parse timepoints from response
    timepoints = []
    for tp in response.timepoints:
        try:
            idx = int(tp.mark_name[1:])  # "w0" -> 0
            timepoints.append({"word": idx, "time": round(tp.time_seconds, 4)})
        except (ValueError, IndexError):
            pass

    print(f"[TTS] Timed ({voice_name}) | mode={mode} | {word_idx} words | {len(timepoints)} timepoints")
    return response.audio_content, timepoints


def _gemini_tts_sync(text: str, mode: str) -> bytes:
    """Synchronous Gemini TTS fallback — Aoede voice (female)."""
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
                    prebuilt_voice_config=_gt.PrebuiltVoiceConfig(voice_name="Aoede")  # female
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


async def _run_tts(text: str, mode: str) -> Response:
    """Shared logic for POST and GET speak endpoints."""
    loop = asyncio.get_running_loop()
    try:
        audio = await loop.run_in_executor(None, _neural_tts_sync, text, mode)
        return Response(content=audio, media_type="audio/mpeg")
    except Exception as e:
        print(f"[TTS] Neural2/Studio failed ({e}) -> trying Gemini fallback")
    try:
        audio = await loop.run_in_executor(None, _gemini_tts_sync, text, mode)
        print(f"[TTS] Gemini Aoede (female) fallback | mode={mode}")
        return Response(content=audio, media_type="audio/wav")
    except Exception as e:
        print(f"[TTS] Both engines failed: {e}")
        raise HTTPException(500, f"TTS generation failed: {str(e)}")


@router.post("/speak", response_class=Response)
async def speak_post(req: TTSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text is required")
    return await _run_tts(text, req.mode)


@router.get("/speak", response_class=Response)
async def speak_get(text: str, mode: str = "default"):
    """
    GET endpoint for web browsers.
    Web TTS sets <audio>.src = this URL directly — avoids fetch() async gap
    that breaks browser autoplay policy. Returns binary audio stream.
    """
    text = text.strip()
    if not text:
        raise HTTPException(400, "text is required")
    response = await _run_tts(text, mode)
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Cache-Control"] = "no-store"
    return response


@router.post("/speak-base64")
async def speak_base64(req: TTSRequest):
    """Returns audio as base64 JSON — avoids all binary handling on mobile."""
    import base64 as b64

    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text is required")

    loop = asyncio.get_running_loop()
    audio = None
    mime = "audio/mpeg"

    try:
        audio = await loop.run_in_executor(None, _neural_tts_sync, text, req.mode)
    except Exception as e:
        print(f"[TTS] Journey failed ({e}) -> trying Gemini")
        try:
            audio = await loop.run_in_executor(None, _gemini_tts_sync, text, req.mode)
            mime = "audio/wav"
        except Exception as e2:
            print(f"[TTS] Both failed: {e2}")
            raise HTTPException(500, f"TTS failed: {e2}")

    encoded = b64.b64encode(audio).decode("ascii")
    print(f"[TTS] base64 | {len(audio)} bytes | {req.mode}")
    return {"audio": encoded, "mime": mime}


@router.post("/speak-timed")
async def speak_timed(req: TTSRequest):
    """
    Returns base64 audio + per-word timepoints from SSML <mark> tags.
    Timepoints are exact timestamps from the Google TTS engine.
    Frontend uses these for karaoke-style word highlighting.

    Falls back to no timepoints if SSML marks fail (Gemini fallback).
    """
    import base64 as b64

    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text is required")

    loop = asyncio.get_running_loop()
    audio = None
    mime = "audio/mpeg"
    timepoints = []

    # Try timed TTS (SSML marks) first
    try:
        audio, timepoints = await loop.run_in_executor(
            None, _neural_tts_timed_sync, text, req.mode
        )
    except Exception as e:
        print(f"[TTS] Timed TTS failed ({e}) -> falling back to standard")
        try:
            audio = await loop.run_in_executor(None, _neural_tts_sync, text, req.mode)
        except Exception:
            try:
                audio = await loop.run_in_executor(None, _gemini_tts_sync, text, req.mode)
                mime = "audio/wav"
            except Exception as e3:
                raise HTTPException(500, f"TTS failed: {e3}")

    encoded = b64.b64encode(audio).decode("ascii")
    print(f"[TTS] timed | {len(audio)} bytes | {len(timepoints)} timepoints | {req.mode}")
    return {"audio": encoded, "mime": mime, "timepoints": timepoints}
