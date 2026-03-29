# Environment Variables

## Backend (`backend/.env`)

| Variable | Required | Default | Used By | Purpose |
|----------|:--------:|---------|---------|---------|
| `GEMINI_API_KEY` | **Yes** | — | `content_agent`, `fluency_agent`, `vocab_agent`, `assignment_agent`, `sel_agent`, `tts.py` | Google AI Studio API key for Gemini text, image, and TTS |
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./readquest.db` | `database.py` | Database connection string. Auto-converts `postgres://` → `postgresql+asyncpg://` |
| `SECRET_KEY` | No | `your-secret-key-here` | `config.py` | App secret (not currently used for JWT) |
| `ENVIRONMENT` | No | `development` | `config.py` | `development` \| `production` |
| `OPENROUTER_API_KEY` | No | — | (legacy) | OpenRouter API key — **no longer used at runtime** |
| `SUPABASE_URL` | No | hardcoded | `database.py`, `content_agent.py` | Supabase project URL |
| `SUPABASE_ANON_KEY` | No | hardcoded | `database.py` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_KEY` | No | — | `content_agent.py` | Service-role key for Storage uploads. Falls back to anon key |
| `GOOGLE_APPLICATION_CREDENTIALS` | No | `gcloud-tts-key.json` | `tts.py` | Path to GCP service account JSON for Chirp3-HD TTS |
| `FRONTEND_URL` | No | — | `main.py` | Added to CORS allowed origins if set |
| `AWS_ACCESS_KEY_ID` | No | — | (deploy) | AWS credentials for deployment |
| `AWS_SECRET_ACCESS_KEY` | No | — | (deploy) | AWS credentials for deployment |
| `AWS_REGION` | No | `us-east-1` | (deploy) | AWS region |
| `AWS_ACCOUNT_ID` | No | — | (deploy) | AWS account ID for ECR |

### What Happens If Missing

| Variable | Impact |
|----------|--------|
| `GEMINI_API_KEY` missing | AI agents return fallback/empty data. TTS Gemini fallback fails. |
| `DATABASE_URL` missing | Uses SQLite locally — works fine for dev |
| `SUPABASE_SERVICE_KEY` missing | Image uploads fall back to local `static/images/` directory |
| `GOOGLE_APPLICATION_CREDENTIALS` missing | Chirp3-HD TTS fails → falls back to Gemini TTS |
| Both TTS keys missing | 500 error on `/api/tts/speak` |

---

## Frontend (`frontend/.env`)

| Variable | Required | Default | Purpose |
|----------|:--------:|---------|---------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API base URL |
| `VITE_SUPABASE_URL` | **Yes** | — | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | — | Supabase anonymous key |

### Frontend Variable Access

All frontend env vars must be prefixed with `VITE_` (Vite convention). Accessed via:
```typescript
import.meta.env.VITE_API_URL
import.meta.env.VITE_SUPABASE_URL
import.meta.env.VITE_SUPABASE_ANON_KEY
```

### What Happens If Missing

| Variable | Impact |
|----------|--------|
| `VITE_API_URL` missing | API calls fail — Axios has no base URL |
| `VITE_SUPABASE_URL` missing | Supabase client can't initialize — auth completely broken |
| `VITE_SUPABASE_ANON_KEY` missing | Same as above |

---

## Backend: Hardcoded Values

> ⚠️ Some values are hardcoded in `content_agent.py` instead of env vars:

```python
SUPABASE_URL     = "https://nspehtlzknfbiwvjswge.supabase.co"
SUPABASE_BUCKET  = "story-images"
```

Consider moving these to `config.py` / `.env` for better portability.

---

## Backend: Config (Pydantic Settings)

```python
class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite+aiosqlite:///./readquest.db"
    SECRET_KEY: str = "..."
    ENVIRONMENT: str = "development"
    OPENROUTER_API_KEY: str = ""
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    
    class Config:
        env_file = ".env"
```

Uses `pydantic-settings` which auto-reads from `.env` file and environment variables.
