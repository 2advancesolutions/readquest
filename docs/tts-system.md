# Text-to-Speech System

## Architecture

ReadQuest uses a **two-tier TTS system** with automatic fallback:

```
POST /api/tts/speak
        │
        ▼
    ┌── Try Chirp3-HD (Google Cloud TTS) ──┐
    │   Uses service account key             │
    │   Returns audio/mpeg (MP3)             │
    └────────────────┬───────────────────────┘
                     │ If fails
                     ▼
    ┌── Fallback: Gemini TTS ──────────────┐
    │   Uses GEMINI_API_KEY                  │
    │   Returns audio/wav (PCM → WAV)        │
    └────────────────────────────────────────┘
```

## Voice Map (Chirp3-HD)

| Mode | Voice | Character |
|------|-------|-----------|
| `story` | `en-US-Chirp3-HD-Aoede` | Warm, engaging storyteller |
| `teacher` | `en-US-Chirp3-HD-Kore` | Clear, encouraging, friendly |
| `quiz` | `en-US-Chirp3-HD-Puck` | Bright, enthusiastic, fun for kids |
| `word` | `en-US-Chirp3-HD-Kore` | Slow + clear pronunciation practice |
| `default` | `en-US-Chirp3-HD-Aoede` | Warm natural |

## Gemini Fallback Style Prompts

When Chirp3-HD fails (no service account key), Gemini TTS uses style-prefixed prompts:

| Mode | Prefix |
|------|--------|
| `story` | "Read warmly as a friendly children's storyteller: " |
| `teacher` | "Speak as a warm encouraging teacher for kids: " |
| `quiz` | "Speak cheerfully and enthusiastically for kids: " |
| `word` | "Say this word slowly and clearly for a child to repeat: " |
| `default` | "Speak naturally and warmly: " |

Gemini voice: **Kore** (fixed for fallback)
Model: `gemini-2.5-flash-preview-tts`

## Word Mode

For the `word` mode (vocabulary pronunciation practice), the text is prefixed with:
```
"Say this word slowly and clearly so a child can repeat it: "
```

## Audio Format

| Engine | Output Format | MIME Type |
|--------|--------------|-----------|
| Chirp3-HD | MP3 | `audio/mpeg` |
| Gemini TTS | PCM → WAV conversion | `audio/wav` |

The Gemini fallback returns raw PCM audio (16-bit, 24kHz) which the backend converts to WAV via `_pcm_to_wav()`.

## Authentication

| Engine | Auth Method |
|--------|------------|
| Chirp3-HD | `GOOGLE_APPLICATION_CREDENTIALS` → `gcloud-tts-key.json` (service account) |
| Gemini TTS | `GEMINI_API_KEY` env var |

Chirp3-HD looks for `gcloud-tts-key.json` in the backend root directory. If not found → immediately falls back to Gemini.

## Text Length Limit

Both engines truncate input to **4,500 characters** maximum.

## Async Safety

Both TTS engines use synchronous SDKs. The backend runs them via `asyncio.to_thread()` to avoid blocking the event loop:

```python
audio = await loop.run_in_executor(None, _chirp3_tts_sync, text, req.mode)
```

## Frontend Integration

The frontend uses the `useSpeechSynthesis.ts` hook which calls `POST /api/tts/speak` and plays the returned audio blob.
