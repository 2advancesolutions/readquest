# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                 │
│  React 18 + TypeScript + Vite                                  │
│  ┌──────────┐ ┌────────────┐ ┌───────────┐ ┌────────────────┐  │
│  │ Supabase │ │ Axios API  │ │ React     │ │ Web Speech API │  │
│  │ Auth     │ │ Service    │ │ Router v6 │ │ (mic + TTS)    │  │
│  └────┬─────┘ └─────┬──────┘ └───────────┘ └────────────────┘  │
│       │              │                                          │
└───────┼──────────────┼──────────────────────────────────────────┘
        │              │ X-Student-ID header on every request
        │              ▼
┌───────┼──────────────────────────────────────────────────────────┐
│       │          BACKEND (FastAPI)                                │
│       │  ┌────────────────────────────────────────────────┐      │
│       │  │              10 API Routers                    │      │
│       │  │  students│stories│quizzes│rewards│tts│parents  │      │
│       │  │  fluency│vocabulary│assignments│quest          │      │
│       │  └─────────────────┬──────────────────────────────┘      │
│       │                    │                                     │
│       │  ┌─────────────────▼──────────────────────────────┐      │
│       │  │           LangGraph AI Agents                  │      │
│       │  │  content_agent │ fluency_agent │ vocab_agent   │      │
│       │  │  assignment_agent │ sel_agent │ learning_agent │      │
│       │  └─────────────────┬──────────────────────────────┘      │
│       │                    │                                     │
│       │  ┌─────────────────▼──────────────┐  ┌───────────────┐  │
│       │  │  Async SQLAlchemy ORM          │  │  Services     │  │
│       │  │  11 models, UUID PKs           │  │  gamification │  │
│       │  │  PostgreSQL (prod) / SQLite    │  │  badges       │  │
│       │  └────────────────────────────────┘  └───────────────┘  │
│       │                                                          │
└───────┼──────────────────────────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────┐   ┌──────────────────────┐
│  Supabase                         │   │  Google Cloud        │
│  • Auth (parent accounts)         │   │  • Gemini 2.5 Flash  │
│  • PostgreSQL (production DB)     │   │  • Gemini Image Gen  │
│  • Storage (story-images bucket)  │   │  • Chirp3-HD TTS     │
│  • reading_progress table         │   │  • Cloud TTS v1      │
│  • reading_logs table             │   └──────────────────────┘
└───────────────────────────────────┘

```

## Tech Stack

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 18.3 |
| Language | TypeScript | 5.4 |
| Build | Vite | 5.3 |
| Routing | React Router | v6 |
| HTTP | Axios | 1.7 |
| Animation | Framer Motion | 11.3 |
| Auth | Supabase JS | 2.100 |
| Font | Plus Jakarta Sans | (Google Fonts) |

### Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | FastAPI | 0.115 |
| Server | Uvicorn | 0.30 |
| ORM | SQLAlchemy (async) | 2.0 |
| AI Orchestration | LangGraph | 0.2 |
| AI Model | Gemini 2.5 Flash | via google-genai 1.7 |
| Image Gen | Gemini 2.5 Flash Image | via google-genai |
| TTS Primary | Google Cloud Chirp3-HD | via cloud-texttospeech |
| TTS Fallback | Gemini TTS (Kore voice) | via google-genai |
| Background Removal | rembg + onnxruntime | 2.0 + 1.19 |
| DB Driver (prod) | asyncpg | latest |
| DB Driver (dev) | aiosqlite | 0.20 |

## Data Flow: Story Generation

```
User clicks "Create Story"
        │
        ▼
POST /api/stories/generate
  body: { grade, theme, character_name, language, art_style }
  header: X-Student-ID
        │
        ▼
┌── LangGraph Content Agent ─────────────────────────────┐
│ 1. grade_setup      → Enrich with vocab guidelines     │
│ 2. story_writer     → Gemini generates 5-page JSON     │
│ 3. parse_story      → Parse JSON (3 fallback strats)   │
│ 4. image_prompt_gen → Build prompts + generate images  │
│ 5. quiz_generator   → Gemini creates quiz questions    │
│ 6. assemble_result  → Combine everything               │
└────────────────────────────────────────────────────────┘
        │
        ▼
Persist to DB (Story + StoryPages + QuizQuestions)
  ↳ If DB fails → still returns full story (graceful)
        │
        ▼
Return JSON → Frontend renders in BookReader
```

## Data Flow: Fluency Analysis

```
Child reads aloud → Web Speech API transcript
        │
        ▼
POST /api/fluency/analyze
  body: { transcript, source_text, duration_secs, ... }
        │
        ▼
┌── LangGraph Fluency Agent ─────────────────────────────┐
│ 1. compare_words    → SequenceMatcher + fuzzy matching  │
│ 2. calculate_fluency → Accuracy %, WPM                 │
│ 3. generate_feedback → Gemini kid-friendly feedback     │
└────────────────────────────────────────────────────────┘
        │
        ▼
Persist to DB (FluencySession + WordErrors)
        │
        ▼
Return → Frontend highlights errors in story text
```

## Directory Structure

```
readquest/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, router registration
│   │   ├── config.py            # Pydantic Settings (reads .env)
│   │   ├── database.py          # Engine, session factory, table creation, badge seeding
│   │   ├── models/              # SQLAlchemy ORM models (11 files)
│   │   ├── routers/             # API route handlers (10 files)
│   │   ├── agents/              # LangGraph AI agents (6 files)
│   │   ├── services/            # Business logic (gamification, badges, AI bridge)
│   │   └── schemas/             # (currently empty — Pydantic models inline in routers)
│   ├── static/                  # Generated images/videos (local fallback)
│   ├── requirements.txt
│   ├── .env / .env.example
│   ├── supabase_setup.sql       # Production Supabase schema
│   └── gcloud-tts-key.json      # Google Cloud TTS service account
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Router config + image preloading
│   │   ├── main.tsx             # React DOM entry
│   │   ├── pages/               # 14 page components
│   │   ├── components/          # Shared components + reader/ + layout/ + common/
│   │   ├── hooks/               # useSpeechRecognition, useSpeechSynthesis, useSoundEffects
│   │   ├── services/api.ts      # Axios client + all API wrappers
│   │   ├── lib/supabase.ts      # Supabase client init
│   │   ├── types/index.ts       # All TypeScript interfaces
│   │   └── styles/              # 13 CSS files + design-tokens.css
│   ├── vite.config.ts           # Dev proxy /api → localhost:8000
│   ├── package.json
│   └── .env / .env.example
│
├── docs/                        # ← You are here
├── deploy.sh                    # AWS deployment script
└── CLAUDE.md                    # AI assistant context
```
