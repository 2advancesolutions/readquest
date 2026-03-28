# ReadQuest Documentation

> AI-powered K-8 reading platform with gamification, speech fluency coaching, and an immersive story generator.

## Quick Links

| Document | What it covers |
|----------|---------------|
| [[architecture]] | System overview, tech stack, data flow diagrams |
| [[database-schema]] | Every table, column, FK, and index |
| [[api-reference]] | All backend routes, request/response shapes |
| [[frontend-structure]] | Pages, components, hooks, services, routing |
| [[ai-agents]] | LangGraph agents — content, fluency, vocabulary, SEL |
| [[design-system]] | CSS tokens, color palette, typography, spacing |
| [[auth-and-identity]] | Supabase auth, parent/student ID flow, headers |
| [[gamification]] | XP rules, badges, streaks, leveling |
| [[tts-system]] | Text-to-Speech: Chirp3-HD voices, Gemini fallback |
| [[speech-recognition]] | Web Speech API, iOS quirks, fluency scoring |
| [[deployment]] | AWS ECR → App Runner (backend), S3 → CloudFront (frontend) |
| [[gotchas-and-pitfalls]] | Common bugs, known issues, things that break silently |
| [[environment-variables]] | Every env var, where it's used, what happens if missing |

## Running Locally

```bash
# Backend (FastAPI + uvicorn)
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Frontend (Vite + React)
cd frontend
npm run dev          # → http://localhost:5173
```

## Key Conventions

- **Student ID header**: Every API call includes `X-Student-ID` (injected by Axios interceptor)
- **UUID as text**: All IDs are `UUID(as_uuid=False)` — stored as text strings, not native UUID
- **Async everything**: Backend uses async SQLAlchemy, async httpx, `asyncio.to_thread()` for sync SDKs
- **Graceful degradation**: DB failures never kill API responses — fallback data is returned
- **Dual persistence**: Reading progress + logs save to both localStorage and Supabase
