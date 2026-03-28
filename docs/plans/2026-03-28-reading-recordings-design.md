# Reading Recordings System — Design Document

**Date:** 2026-03-28
**Status:** Approved

## Overview

Add an audio recording and playback system that captures children reading aloud, stores the recordings with transcripts in IndexedDB, and provides a parent-facing UI to browse and play back recordings organized by book.

## Goals

1. Record the child's voice while reading each page (via `MediaRecorder` API)
2. Save both the audio AND the transcript with word-level accuracy data
3. Provide a `/recordings` route with a folder-like structure (books → page recordings)
4. Karaoke-style playback that highlights words as the audio plays, showing correct (green) and missed (red) words

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Storage | IndexedDB (`readquest-recordings`) | Cross-browser, offline-capable, no server cost |
| What to save | Audio blob + transcript + word statuses | Parents hear the child AND see reading accuracy |
| Recording trigger | Synced with mic button (start on 🎤 press, stop on 🎤 toggle/Next) | Clean single clip per page attempt |
| Playback style | Follow-along karaoke reader | Most engaging for parents; shows proficiency visually |

## Data Model

```typescript
interface Recording {
  id?: number                 // auto-increment (IndexedDB key)
  studentId: string
  studentName: string
  bookId: string
  bookTitle: string
  bookCover?: string          // cover URL for display
  gradeLevel: number
  pageNumber: number
  pageText: string            // original story page text
  transcript: string          // what the child actually said
  wordStatuses: WordStatus[]  // ['correct','wrong','correct',...]
  accuracy: number            // percentage (0-100)
  audioBlob: Blob             // WebM audio from MediaRecorder
  duration: number            // seconds
  createdAt: string           // ISO timestamp
}
```

IndexedDB indexes: `[studentId, bookId]` for fast per-book queries.

## New Routes

| Route | Page Component | Purpose |
|-------|---------------|---------|
| `/recordings` | `RecordingsLibrary.tsx` | Table of all books that have recordings |
| `/recordings/:bookId` | `BookRecordings.tsx` | All recordings for one book, listed by page/date |
| `/recordings/:bookId/:recordingId` | `RecordingPlayback.tsx` | Follow-along karaoke player |

## Page Designs

### `/recordings` — Library View
- Night-Bloom themed table (matching Dashboard aesthetic)
- Columns: Cover thumbnail, Book Title, Grade, # of Recordings, Last Recorded, Avg Accuracy
- Clicking a row → navigates to `/recordings/:bookId`
- Empty state: "No recordings yet — go read a story! 📖"

### `/recordings/:bookId` — Book Recordings
- Header showing book title + cover
- List of recordings as cards, grouped by page:
  - "Page 1 — Mar 28, 2026 — 92% accuracy — 0:34"
  - Play button for quick inline playback
  - Click card → full playback view
- Download button on each (saves `.webm`)

### `/recordings/:bookId/:recordingId` — Playback
- Audio player bar (play/pause, seek, time)
- Story page text with karaoke highlighting:
  - Words light up progressively (estimated timing: duration ÷ word count)
  - Correct words glow green, missed words glow red
- Transcript shown below for comparison
- Accuracy score badge in corner

## New Files

| File | Purpose |
|------|---------|
| `src/hooks/useAudioRecorder.ts` | `MediaRecorder` wrapper |
| `src/services/recordingsDb.ts` | IndexedDB CRUD service |
| `src/pages/RecordingsLibrary.tsx` | Book table view |
| `src/pages/BookRecordings.tsx` | Recordings list for one book |
| `src/pages/RecordingPlayback.tsx` | Karaoke player |
| `src/styles/recordings.css` | Styles for all 3 pages |

## Modified Files

| File | Change |
|------|--------|
| `BookReader.tsx` | Hook up `useAudioRecorder`; save to IndexedDB on page advance |
| `App.tsx` | Add 3 new routes |
| `Dashboard.tsx` | Add "Recordings" nav link to sidebar |
| `types/index.ts` | Add `Recording` interface |

## Integration: BookReader.tsx

- `toggleMic()` → also calls `recorder.start()` / `recorder.stop()`
- `handleNextPage()` → calls `recordingsDb.save(...)` with audio blob + transcript + word statuses
- Recording is invisible to the student — no UX changes to the reading flow
- `getUserMedia` is already called for speech recognition permission; `MediaRecorder` reuses the same stream

## No Backend Changes

Everything is frontend-only. IndexedDB provides persistence across sessions.
