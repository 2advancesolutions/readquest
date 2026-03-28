# Gamification System

## XP Rules Engine

| Action | XP | Reason String |
|--------|---:|---------------|
| Read a page | 5 | `page_read` |
| Quiz attempt (any) | 3 | `quiz_attempt` |
| Quiz correct answer | 10 | `quiz_correct` |
| Complete a book | 50 | `book_complete` |
| Daily login | 15 | `daily_login` |
| 3-day streak bonus | 25 | `streak_3` |
| 7-day streak bonus | 75 | `streak_7` |
| 14-day streak bonus | 150 | `streak_14` |
| 30-day streak bonus | 500 | `streak_30` |

## Leveling

```
Level = min(total_xp // 200 + 1, 5)
```

| Level | Name | XP Range |
|:-----:|------|----------|
| 1 | Reading Rookie | 0-199 |
| 2 | Page Turner | 200-399 |
| 3 | Story Star | 400-599 |
| 4 | Book Champion | 600-799 |
| 5 | Reading Legend | 800+ |

- Max level is 5 (capped)
- `XP_PER_LEVEL = 200`
- `xp_progress_pct = ((total_xp % 200) / 200) * 100`

## Streak Tracking

**How it works:**
- Every time XP is awarded, `track_streak()` adds a row to `streaks` table for today (idempotent)
- Streak length = count of consecutive days backward from today where a `streaks` row exists

**Calculation (SQL-side):**
```python
streak_dates = sorted by date DESC
length = 0
check = date.today()
for d in streak_dates:
    if d == check:
        length += 1
        check -= 1 day
    else:
        break
```

This means a student must read **every day** to maintain a streak. Missing one day resets it to 0.

## Badges

### Badge Definitions (8 core badges, seeded on startup)

| Slug | Name | Icon | Criteria |
|------|------|:----:|----------|
| `first_book` | First Book! | 📖 | `stories_read ≥ 1` |
| `streak_3` | 3-Day Streak | 🔥 | `streak_days ≥ 3` |
| `streak_7` | 7-Day Streak | 🏆 | `streak_days ≥ 7` |
| `quiz_master` | Quiz Master | 🧠 | `quiz_correct ≥ 5` |
| `speed_reader` | Speed Reader | ⚡ | `speed_minutes ≤ 10` (not yet implemented) |
| `explorer` | Genre Explorer | 🗺️ | `unique_themes ≥ 3` (not yet implemented) |
| `bookworm` | Bookworm | 🐛 | `stories_read ≥ 5` |
| `word_wizard` | Word Wizard | 🔮 | `level ≥ 3` |

### Badge Checking Flow

```
XP awarded  →  track_streak()  →  check_badges()
                                       │
                   ┌───────────────────┤
                   ▼                   ▼
          Get total XP          Get streak length
          Calculate level       Get quiz correct count
                   ▼                   ▼
             For each badge not already earned:
               Check if criteria met → Award
```

### ⚠️ Criteria Key Mismatch

There are TWO badge check implementations with **different criteria keys**:

| Service | File | Criteria Keys |
|---------|------|---------------|
| `gamification_service.py` | `check_badges()` | `streak`, `level`, `quiz_correct` |
| `badge_service.py` | `check_and_award_badges()` | `stories_read`, `streak_days`, `level` |
| Supabase SQL seed | `supabase_setup.sql` | `stories_read`, `streak_days`, `quiz_correct`, `speed_minutes`, `unique_themes`, `level` |

**The `gamification_service` uses different key names than what's seeded in the SQL.** This means some badge criteria won't match:
- SQL seeds `streak_days:3` but `gamification_service` checks `streak`
- SQL seeds `stories_read:1` but `gamification_service` doesn't check `stories_read`

The `badge_service` is more aligned with the SQL, but it also doesn't check `quiz_correct` or `speed_minutes`.

### Badge Seeding

```python
# database.py → _seed_badges()
# Runs on every startup via raw async SQL
INSERT INTO badges (...) VALUES (...) ON CONFLICT (slug) DO NOTHING
```

Also seeded in `supabase_setup.sql` for production (with ON CONFLICT DO NOTHING).

## Reading Progress Tracking

### Dual Persistence
1. **localStorage** (frontend) — for instant resume-reading without API call
2. **Supabase** (via API + direct client) — for cross-device persistence

### Progress Flow
```
Student reads page N
      │
      ├─ POST /stories/{id}/pages/{N}/read  → Awards 5 XP
      │
      ├─ POST /stories/{id}/progress        → Saves last_page to Supabase
      │
      └─ localStorage.setItem(...)          → Saves to localStorage
      
Student finishes book
      │
      ├─ POST /stories/{id}/complete         → Awards 50 XP, sets completed_at
      │
      └─ supabase.from('reading_logs').insert(...)  → Saves completion log
```

## XP Sync

The frontend can batch-sync XP from reading logs:

```typescript
rewardsApi.syncXP({ entries: [
  { story_id: "...", total_xp: 80 },
  { story_id: "...", total_xp: 65 },
] })
```

Uses idempotency keys to prevent double-awarding.

## Reading Logs (Frontend → Supabase Direct)

When a student finishes a book, the frontend writes directly to Supabase `reading_logs`:

```typescript
const log = {
  student_id,
  story_id,
  story_title,
  reading_accuracy,
  quiz_score,
  quiz_total,
  comprehension_score,
  total_xp,
  stars,
  feedback,
  completed_at,
}
supabase.from('reading_logs').insert(log)
```

Stars calculation:
- `accuracy < 50%` → ⭐ (1 star)
- `accuracy < 80%` → ⭐⭐ (2 stars)
- `accuracy >= 80%` → ⭐⭐⭐ (3 stars)
