# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ReadQuest** is an AI-powered K-8 reading platform with gamification (XP, badges, streaks) and an AI tutoring suite (fluency coaching, vocabulary lessons, quest mode, reading assignments). It has a React/TypeScript frontend and a Python/FastAPI backend with LangGraph agents.

## Commands

### Frontend (`/frontend`)
```bash
npm run dev        # Start dev server on port 3000
npm run build      # tsc + vite build
npm run lint       # ESLint
npx playwright test  # E2E tests
```

### Backend (`/backend`)
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000   # Dev server
```

### Deployment
```bash
./deploy.sh   # AWS: Docker → ECR → App Runner (backend), build → S3 → CloudFront (frontend)
```

## Environment Variables

**Frontend** (`frontend/.env`):
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Backend** (`backend/.env`):
```
GEMINI_API_KEY=
DATABASE_URL=sqlite+aiosqlite:///./readquest.db   # or Supabase Postgres
SECRET_KEY=
SUPABASE_SERVICE_KEY=
SUPABASE_ANON_KEY=
OPENROUTER_API_KEY=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
```

## Architecture

### Frontend (React 18 + Vite + TypeScript)
- **Auth:** Supabase handles parent authentication; selected student ID is stored in `localStorage` and injected as `X-Student-ID` header on every API call
- **API layer:** `src/services/api.ts` — Axios client with request deduplication (2s TTL), 180s default timeout, 5min for story generation
- **Routing:** React Router v6 in `App.tsx`; most routes are protected (require Supabase session)
- **Dev proxy:** Vite proxies `/api/*` → `http://localhost:8000`

### Backend (FastAPI + async SQLAlchemy)
- **Entry point:** `backend/app/main.py` — registers all 10 routers under `/api/`, seeds badge data on startup, serves `/static` for generated media
- **DB sessions:** injected via FastAPI `Depends(get_db)` using async SQLAlchemy
- **Database:** SQLite for local dev; Supabase PostgreSQL in production. Schema in `backend/supabase_setup.sql`
- **Config:** `backend/app/config.py` — Pydantic `Settings` class reads from `.env`

### AI Agents (`backend/app/agents/`)
All agents are LangGraph graphs calling **Gemini** (primary) or **OpenRouter** (fallback):
| Agent | Purpose |
|-------|---------|
| `content_agent.py` | Story generation, image prompts, quiz creation |
| `fluency_agent.py` | Fluency coaching using speech recognition scores |
| `vocabulary_agent.py` | Vocabulary lessons |
| `assignment_agent.py` | Auto-generated reading assignments |
| `quest.py` | Quest/game mode logic |
| `sel_agent.py` | Social-emotional learning |

### Gamification
- **XP & Levels:** tracked in `xp_ledger` table; `gamification_service.py` handles calculations
- **Badges:** seeded at startup (8 core badges); `badge_service.py` evaluates unlock criteria stored as JSONB in the `badges` table
- **Streaks:** one row per day per student in `streaks` table

### AWS Deployment
- **Backend:** Docker image → ECR → App Runner (`readquest-backend` service)
- **Frontend:** `dist/` → S3 bucket → CloudFront CDN
