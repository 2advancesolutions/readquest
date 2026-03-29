# Spelling Arena — Design Document

**Date**: 2026-03-28
**Status**: Approved

## Overview

A new `/spelling` page where students pick a character buddy and play a mixed-mode spelling game using words they missed during reading plus vocabulary bank words. The character coaches them with TTS voice, animated reactions, and personality-flavored speech bubbles. Correct answers earn XP and build toward per-word mastery.

## User Flow

```
Dashboard → Sidebar "Spelling" link
  → Spelling Landing Page
    → Pick a character (reuse CharacterGallery)
    → "Start Game" button
      → Game Screen (10-word rounds)
        → Random mix of: Spelling Bee / Fill-in-Blanks / Word Scramble
        → Character reacts: bounces on correct, shakes on wrong
        → TTS reads words aloud
        → XP awarded per correct answer
      → Round Summary
        → Score, XP earned, words mastered
        → "Play Again" or "Back to Spelling"
```

## Game Modes

Three modes, randomly assigned per word within each 10-word round:

| Mode | Mechanic |
|---|---|
| **Spelling Bee** | Character reads word via TTS → student types spelling → check |
| **Fill-in-Blanks** | Sentence with missing letters (e.g. "The b_av_ knight") → student fills gaps |
| **Word Scramble** | Scrambled letter tiles → student taps/clicks in correct order |

## Word Sources

Words come from two existing tables, merged and deduplicated:

1. **`word_errors`** (via `fluency_sessions`) — words the student mispronounced, skipped, or repeated during reading
2. **`vocabulary_bank`** — Tier 2 academic words extracted from their stories

Unmastered words are prioritized. If the student has fewer than 10 words available, the pool is padded with grade-appropriate vocabulary from the shared catalog.

## Data Model

### `spelling_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → students |
| `character_name` | String | Selected character |
| `total_words` | Integer | Words in round (default 10) |
| `correct_count` | Integer | Correct answers |
| `xp_earned` | Integer | Total XP awarded |
| `started_at` | DateTime | Session start |
| `completed_at` | DateTime | Nullable, set on finish |

### `spelling_attempts`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `session_id` | UUID | FK → spelling_sessions |
| `word` | Text | Target word |
| `game_mode` | String(20) | 'bee', 'blanks', 'scramble' |
| `student_answer` | Text | What student typed |
| `is_correct` | Boolean | Whether answer was correct |
| `attempt_number` | Integer | 1st, 2nd, 3rd try |

### `word_mastery`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `student_id` | UUID | FK → students |
| `word` | Text | The word |
| `correct_count` | Integer | Total correct across all sessions |
| `attempt_count` | Integer | Total attempts |
| `mastered` | Boolean | True when correct_count ≥ 3 |
| `last_practiced_at` | DateTime | Last practice timestamp |

## Backend API

| Endpoint | Method | Purpose |
|---|---|---|
| `/spelling/words` | GET | Fetch word pool: joins word_errors + vocabulary_bank, prioritizes unmastered |
| `/spelling/sessions` | POST | Create session (character, word count) |
| `/spelling/attempts` | POST | Submit word attempt → returns is_correct, updates mastery, awards XP |
| `/spelling/stats` | GET | Spelling stats: games played, words mastered, accuracy %, streak |

## XP & Rewards

- **+5 XP** per correct answer
- **+20 XP bonus** for completing a 10-word round
- **+10 XP** when a word reaches mastery (3 correct)
- XP via existing `rewardsApi.awardXP()` with idempotency keys (`spelling:{session_id}:{word}:{attempt}`)

## Character Coach

The selected character appears as an animated coach throughout the game:

- **On start**: Bounces in, TTS: "Let's learn some words together!"
- **On correct**: Scale 1.15 bounce, green glow, speech bubble: "Amazing! 🎉"
- **On wrong**: Gentle horizontal shake, speech bubble: "Almost! Try again 💪"
- **On mastery**: Big celebration bounce + confetti, "You mastered [word]! 🏆"
- Phrases themed to character personality

## Frontend Files

| File | Purpose |
|---|---|
| `src/pages/SpellingArena.tsx` | Main page: character select → game → summary |
| `src/styles/spelling.css` | Night-Bloom themed styles |
| `src/components/SpellingBee.tsx` | Spelling Bee mode |
| `src/components/FillBlanks.tsx` | Fill-in-the-blanks mode |
| `src/components/WordScramble.tsx` | Word scramble mode |
| `src/components/SpellingCoach.tsx` | Character coach with animations + speech bubbles |

## Backend Files

| File | Purpose |
|---|---|
| `app/models/spelling.py` | SQLAlchemy models: SpellingSession, SpellingAttempt, WordMastery |
| `app/routers/spelling.py` | API endpoints |
| `app/schemas/spelling.py` | Pydantic request/response schemas |

## Navigation

Add "Spelling" to the Dashboard sidebar nav between "Rewards" and "Recordings" with an ABC/spell-check icon.

Add route `/spelling` to `App.tsx` (protected, requires session).
