# API Reference

> Base URL: `http://localhost:8000/api` (dev) · All routes require `X-Student-ID` header (set by Axios interceptor).

## Stories (`/api/stories`)

### `POST /stories/analyze-character`
Identifies a character and generates a transparent-background portrait.

**Request:**
```json
{ "character": "SpongeBob" }
```

**Response:**
```json
{
  "character_name": "SpongeBob",
  "universe": "Nickelodeon",
  "description": "A cheerful yellow sea sponge...",
  "character_image_url": "https://...supabase.co/storage/.../portrait_abc.png",
  "scenes": []
}
```

**Flow:** Gemini text → visual description → Gemini image → rembg background removal → Supabase Storage upload

---

### `POST /stories/generate`
Generates a complete AI story with 5 pages, illustrations, and quiz questions.

**Request:**
```json
{
  "grade": 2,
  "theme": "space",
  "character_name": "Luna",
  "language": "english",
  "art_style": "cartoon",
  "sel_theme": null,
  "story_mode": "free_play"
}
```

**Response:** Full `StoryResponse` with `pages[]`, `quiz_questions[]`, `cover_media_url`

**Timeout:** 5 minutes (300s) — story text + 5 image generations
**Art styles:** `cartoon`, `pixar`, `real`, `watercolor`, `manga`, `sketch`, `storybook`, `neon`

---

### `POST /stories/generate-background`
Generates a wide cinematic background + optional character-in-scene portrait.

**Request:**
```json
{
  "theme": "space",
  "character_name": "Luna",
  "scene_description": "exploring a colorful alien planet"
}
```

**Response:**
```json
{
  "background_url": "https://...supabase.co/.../bg.png",
  "portrait_url": "https://...supabase.co/.../portrait.png"
}
```

---

### `GET /stories`
List all stories for the current student (or all children if parent UUID).

**Response:** Array of story summaries with `progress_pct`, `last_page`, `completed_at`

---

### `GET /stories/{story_id}`
Get full story with pages and quiz questions.

---

### `DELETE /stories/{story_id}`
Delete story and cascade to pages + quiz questions.

---

### `POST /stories/{story_id}/pages/{page_number}/read`
Awards 5 XP for reading a page.

---

### `POST /stories/{story_id}/complete`
Awards 50 XP and marks story completed in reading_progress.

---

### `POST /stories/{story_id}/repair-images`
Regenerate missing page images (admin utility).

---

### `POST /stories/grade-comprehension`
AI-grades student's story comprehension.

**Request:**
```json
{
  "story_text": "Full story...",
  "summary": "Student's summary...",
  "qa_answers": [{"question": "...", "answer": "..."}]
}
```

**Response:**
```json
{ "score": 85, "feedback": "Great job understanding the story!" }
```

---

## Students (`/api/students`)

### `POST /students`
```json
{ "name": "Luna", "grade_level": 2 }
```

### `GET /students/{id}`
Returns student with grade info.

---

## Quizzes (`/api/quizzes`)

### `POST /quizzes/{question_id}/submit`
```json
{ "answer": "Choice B" }
```
Awards 10 XP if correct, 3 XP for attempt.

---

## Rewards (`/api/rewards`)

### `GET /rewards/xp`
Returns `{ total_xp, level, level_name, xp_to_next_level, xp_progress_pct }`

### `GET /rewards/xp/history`
Returns array of `{ date, amount }` entries.

### `GET /rewards/badges`
Returns all badges with `earned: true/false` + `earned_at`.

### `GET /rewards/streaks`
Returns `{ current_streak, weekly_activity: [{date, active}] }`

### `GET /rewards/leaderboard`
Returns sorted array of students with XP + rank.

### `POST /rewards/record-activity`
Records today's reading activity (streak tracking).

### `POST /rewards/complete-story?story_id={id}`
Marks story completed + checks badge eligibility.

### `POST /rewards/award-xp`
Idempotent XP award.
```json
{ "amount": 50, "reason": "reading_log_abc", "idempotency_key": "reading_log_abc" }
```

### `POST /rewards/sync-xp`
Backfill XP from reading logs.
```json
{ "entries": [{"story_id": "...", "total_xp": 50}] }
```

---

## TTS (`/api/tts`)

### `POST /tts/speak`
```json
{ "text": "Hello Luna!", "mode": "story" }
```

**Modes:** `story` (Aoede), `teacher` (Kore), `quiz` (Puck), `word` (Kore, slow), `default` (Aoede)
**Response:** `audio/mpeg` (Chirp3-HD) or `audio/wav` (Gemini fallback)

---

## Fluency (`/api/fluency`)

### `POST /fluency/analyze`
```json
{
  "story_id": "uuid",
  "page_number": 1,
  "transcript": "Luna loved space she liked stars...",
  "source_text": "Luna loved space. She liked stars and planets.",
  "duration_secs": 45.2
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "accuracy_pct": 96.2,
  "words_per_minute": 52.3,
  "correct_words": 50,
  "total_words": 52,
  "word_errors": [{"word": "planets", "spoken_word": "planet", "error_type": "mispronounced", "word_index": 8}],
  "feedback": "Amazing reading! You did a fantastic job! 🌟"
}
```

### `GET /fluency/sessions/{student_id}`
List last 50 fluency sessions.

### `GET /fluency/session/{session_id}/errors`
Get word errors for a session.

### `GET /fluency/summary/{student_id}`
Aggregate stats: avg accuracy, avg WPM, top error words.

---

## Vocabulary (`/api/vocabulary`)

### `POST /vocabulary/extract`
Extract Tier 2 words from story text.

### `GET /vocabulary/bank/{student_id}`
Get student's vocab bank.

### `POST /vocabulary/save`
Save a word to student's bank.

---

## Assignments (`/api/assignments`)

### `POST /assignments/generate`
AI-generates an assignment based on fluency/vocab data.

### `GET /assignments/{student_id}`
List assignments.

### `POST /assignments/{id}/submit`
Submit answers.

---

## Quest (`/api/quest`)

### `GET /quest/progress/{student_id}`
Get quest level progress.

### `POST /quest/check-advance/{student_id}`
Check if student qualifies to advance.

### `GET /quest/levels`
List all quest levels.

---

## Parents (`/api/parents`)

### `POST /parents/register`
Register parent profile.

### `GET /parents/children`
List parent's children.

### `POST /parents/reviews`
Submit star grade + comment for child's work.

### `GET /parents/reviews/{student_id}`
Get reviews for a student.

### `GET /parents/dashboard/{student_id}`
Comprehensive parent dashboard data.

---

## Health

### `GET /health`
```json
{ "status": "ok", "service": "ReadQuest API" }
```
