# Gotchas & Pitfalls

> Things that break silently, bite you in production, or waste hours debugging.

---

## 🗄️ Database

### 1. `reading_progress` schema mismatch
The SQLAlchemy model uses `pages_read` and `completed`, but the Supabase SQL creates `last_page`, `total_pages`, `completed_at`. The frontend writes to Supabase using `last_page`/`total_pages` directly via the Supabase client. If you add a new column, you must update **both** the model AND the SQL.

### 2. `reading_logs` has no SQLAlchemy model
This table only exists in Supabase (created via `supabase_setup.sql`). The frontend writes to it directly via `supabase.from('reading_logs').insert(...)`. The backend never touches this table. If you need backend access, you'll need to create a model.

### 3. Badge criteria key names don't match
Three different files use different key names for the same badge criteria:
- `supabase_setup.sql` → `stories_read`, `streak_days`, `quiz_correct`
- `gamification_service.py` → `streak`, `level`, `quiz_correct`
- `badge_service.py` → `stories_read`, `streak_days`, `level`

Some badges will never be awarded because the check function looks for keys that don't exist in the DB-seeded criteria JSON.

### 4. UUID as text, not native UUID
All models use `Column(String, primary_key=True, default=uuid_str)` where `uuid_str = lambda: str(uuid.uuid4())`. These are TEXT columns, not PostgreSQL's native UUID type. This works fine but means you can't use Postgres UUID functions.

### 5. `metadata` column name conflict
The `Story` model maps `metadata_` in Python to `metadata` in the DB because `metadata` is a reserved name in SQLAlchemy.

### 6. No Alembic migrations
Schema changes are applied via `Base.metadata.create_all(checkfirst=True)`. This:
- ✅ Creates missing tables automatically
- ❌ Does NOT add new columns to existing tables
- ❌ Does NOT modify column types
- ❌ Does NOT drop removed columns

**Impact:** If you add a new column to a model, you must manually ALTER TABLE in Supabase SQL Editor.

---

## 🤖 AI Agents

### 7. Gemini JSON output often wrapped in markdown
Gemini frequently returns JSON wrapped in ` ```json ... ``` ` fences. Every agent must strip these. Standard strategy:
```python
if "```" in raw:
    raw = raw.split("```")[1]
    if raw.startswith("json"): raw = raw[4:]
```

### 8. Image generation safety filters
Gemini's image model blocks prompts containing action words (`fight`, `battle`, `gun`, etc.). The content agent sanitizes prompts by replacing blocked words with `adventure`, but some story themes may still trigger safety blocks. The agent has 3 safe fallback prompts it tries sequentially.

### 9. Image rate limiting
Gemini image generation has strict rate limits. The content agent adds a 2-second delay between page image generations (`asyncio.sleep(2)`). If you parallelize, you'll hit `RESOURCE_EXHAUSTED` errors.

### 10. `ai_service.py` doesn't pass `language` or `art_style`
The bridge function `generate_story_with_ai()` calls `run_content_agent()` but only passes `grade`, `theme`, `character_name` — the `language` and `art_style` parameters are ignored! All stories use default English and cartoon style.

---

## 🎤 Speech Recognition

### 11. iOS Safari + `continuous=true` = broken
Setting `continuous: true` on iOS Safari causes the recognition to never fire events. The hook sets `continuous: false` on iOS and auto-restarts on `onend`.

### 12. `startListening()` must be synchronous
If there's ANY `await` between the user's click and `recognition.start()`, iOS will block the mic permission. The hook is designed so `startListening()` is purely synchronous.

### 13. Transcript accumulates across restarts
On iOS, the recognition restarts multiple times per session. `transcriptRef.current` accumulates the final transcript across restarts. If you reset this ref incorrectly, you'll lose parts of the reading.

---

## 🔐 Auth & Identity

### 14. Student ID priority confusion
The Axios interceptor has 3 priority levels for `X-Student-ID`:
1. Explicit header (from caller)
2. `readquest_student_id` from localStorage
3. Supabase auth user UUID

If no child is selected (level 2 empty), API calls use the parent UUID, creating stories that belong to the parent — not any specific child. These stories then appear for ALL children.

### 15. FK guard creates dummy users
The story generation endpoint auto-creates `Parent` and `Student` rows using the same UUID for both. This prevents FK violations but creates phantom user records that may confuse queries.

### 16. Guest mode
If no auth at all, `x_student_id` becomes `"guest"`. Stories are created but can never be attributed to a real user.

---

## 🌐 Frontend

### 17. Deduplication cache on GET requests
The `deduplicate()` wrapper in `api.ts` caches identical GET responses for 2 seconds. This prevents duplicate concurrent requests but means **stale data can be returned for up to 2 seconds** after a mutation. If you POST something and immediately GET, you might get the old data.

### 18. Timeout hierarchy
- Normal requests: **180 seconds**
- Story generation: **300 seconds** (5 minutes!)
- Background generation: **120 seconds**

If the backend takes longer, Axios throws a timeout error. The user sees an error even though the backend may still be generating.

### 19. CORS must include all deployment domains
The backend has a hardcoded allowlist of CORS origins. If you deploy to a new domain, you must add it to `_ALLOWED_ORIGINS` in `main.py`. The regex patterns cover `*.cloudfront.net` and `*.awsapprunner.com`.

### 20. Image preloading order matters
`App.tsx` preloads gallery images in two phases. Phase 1 (7 priority characters) runs immediately. Phase 2 uses `requestIdleCallback`. If you add new gallery characters, add popular ones to Phase 1.

---

## 🚀 Deployment

### 21. Static files are ephemeral in containers
Images saved to `static/images/` are lost when the container restarts. Always use Supabase Storage (`_upload_to_supabase()`) for persistent images. The local fallback should only be used for development.

### 22. `gcloud-tts-key.json` must be in container
The Google Cloud TTS service account key must be present in the container. If deploying with Docker, make sure to COPY it. If missing, TTS silently falls back to Gemini TTS (which uses the API key instead).

### 23. Supabase URL hardcoded in content_agent.py
The Supabase URL and bucket name are hardcoded at the top of `content_agent.py` instead of coming from the config. If you change Supabase projects, you need to update this file directly.

---

## 🐛 Debugging Tips

1. **Stories not generating?** Check `GEMINI_API_KEY` is set and has quota. Look for `RESOURCE_EXHAUSTED` in backend logs.
2. **Images missing?** Check `SUPABASE_SERVICE_KEY`. If missing, images save locally and disappear on restart.
3. **TTS not working?** Check for `gcloud-tts-key.json` (Chirp3-HD) AND `GEMINI_API_KEY` (fallback). Both fail = 500.
4. **Badges not awarding?** Check criteria key names match between SQL seed and Python check functions. See gotcha #3.
5. **Speech errors showing for correct words?** The fuzzy matching should handle most cases. If not, add the word pair to `_HOMOPHONES` dict in `fluency_agent.py`.
6. **New column not appearing?** `create_all()` doesn't ALTER existing tables. Run manual ALTER TABLE in Supabase SQL Editor.
