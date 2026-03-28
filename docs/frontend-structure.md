# Frontend Structure

## Routing (App.tsx)

| Path | Page | Auth Required | Description |
|------|------|:---:|-------------|
| `/` | `LandingPage` | No | Marketing / hero page |
| `/signup` | `Signup` | No | Signup wizard (multi-step) |
| `/login` | `Login` | No | Supabase email auth |
| `/add-kid` | `AddKid` | Yes | Parent adds a child profile |
| `/dashboard` | `Dashboard` | Yes | Kid's main hub |
| `/read/:storyId` | `BookReader` | Yes | Full reading experience |
| `/generate` | `StoryGenerator` | Yes | Create a new story |
| `/rewards` | `Rewards` | Yes | XP, badges, leaderboard |
| `/shelf` | `ReadingShelf` | Yes | Library of all stories |
| `/profile` | `Profile` | Yes | Student profile & settings |
| `/quest` | `QuestMode` | Yes | Structured progression |
| `/assignments` | `Assignments` | Yes | AI-generated homework |
| `/parent-dashboard` | `ParentDashboard` | Yes | Parent oversight view |

Auth guard pattern: `session ? <Page /> : <Navigate to="/login" replace />`

---

## Pages (`src/pages/`)

| File | Size | Purpose |
|------|------|---------|
| `StoryGenerator.tsx` | 77KB | 3-step wizard: character → theme → generate. Immersive "Night-Bloom" UI |
| `BookReader.tsx` | 64KB | Read story, speech recognition, quiz, completion celebration |
| `LandingPage.tsx` | 38KB | Marketing hero with feature cards |
| `Dashboard.tsx` | 27KB | Kid's main view: continue reading, quick actions |
| `Rewards.tsx` | 24KB | XP bar, badges grid, streaks, leaderboard |
| `ReadingShelf.tsx` | 23KB | Story library with filters and progress |
| `ParentDashboard.tsx` | 18KB | Parent view: child stats, reading logs, reviews |
| `AddKid.tsx` | 18KB | Add child form with avatar + grade |
| `Signup.tsx` | 16KB | Multi-step signup wizard |
| `Assignments.tsx` | 14KB | View and complete AI assignments |
| `Profile.tsx` | 13KB | Student profile, avatar, grade |
| `QuestMode.tsx` | 11KB | Level progression UI |
| `Login.tsx` | 3.5KB | Email/password login |
| `mockStory.ts` | 3.3KB | Dev/test mock story data |

---

## Components (`src/components/`)

### Core Components
| File | Purpose |
|------|---------|
| `CharacterGallery.tsx` | Scrollable character picker with 20+ pre-loaded characters |
| `CharacterHero.tsx` | Animated character portrait display |
| `HeroCharDisplay.tsx` | Small hero character avatar |
| `RandomHeroChar.tsx` | Random character selector |
| `WelcomeVoice.tsx` | TTS welcome greeting with voice selection |
| `LogoutButton.tsx` | Supabase logout button |

### Reader Components (`components/reader/`)
| File | Purpose |
|------|---------|
| `SpeechReader.tsx` | Mic button + speech-to-text + fluency analysis integration |

### Layout Components (`components/layout/`)
Shared layout wrappers.

### Common Components (`components/common/`)
Reusable UI primitives.

---

## Services (`src/services/api.ts`)

Single file containing all API wrappers organized by domain:

| Export | Methods |
|--------|---------|
| `studentsApi` | `create`, `get` |
| `storiesApi` | `analyzeCharacter`, `generate`, `generateBackground`, `list`, `get`, `delete` |
| `quizzesApi` | `submit` |
| `rewardsApi` | `getXP`, `getXPHistory`, `getBadges`, `getStreaks`, `getLeaderboard`, `recordActivity`, `completeStory`, `awardXP`, `syncXP` |
| `progressApi` | `markPageRead`, `markBookComplete`, `saveProgress`, `getProgressBatch`, `getProgress` |
| `readingLogsApi` | `saveLog`, `getLogs`, `getLogsForStudent` |

### Key Patterns
- **Deduplication**: `deduplicate()` wrapper prevents concurrent identical GET requests (2s TTL)
- **Timeouts**: Normal=180s, Story generation=300s, Background generation=120s
- **Student ID injection**: Axios interceptor reads `readquest_student_id` from localStorage → `X-Student-ID` header
- **Dual persistence**: `progressApi` and `readingLogsApi` save to both localStorage AND Supabase

---

## Hooks (`src/hooks/`)

### `useSpeechRecognition.ts`
Web Speech API wrapper with iOS Safari compatibility.

**Key behaviors:**
- `startListening()` must be called **synchronously** from a user gesture (NO await before it)
- On iOS, sets `continuous=false` and auto-restarts on `onend`
- Accumulates transcript across iOS restarts via `transcriptRef`
- Handles `not-allowed`, `network`, `no-speech`, `aborted` errors

**Returns:** `{ startListening, stopListening, transcript, interimTranscript, resetTranscript, isListening, isSupported, permissionError }`

### `useSpeechSynthesis.ts`
TTS playback hook using the backend `/api/tts/speak` endpoint.

### `useSoundEffects.ts`
Preloaded sound effects for UI interactions (celebrations, clicks, etc.).

---

## Types (`src/types/index.ts`)

All TypeScript interfaces live in one file. Key types:

| Type | Used For |
|------|----------|
| `Student` | Student profiles |
| `Story`, `StoryPage`, `QuizQuestion` | Story data |
| `Badge`, `StudentRewards` | Gamification |
| `FluencySession`, `WordError` | Reading analysis |
| `VocabularyWord` | Word bank |
| `Assignment`, `AssignmentTask`, `AssignmentResult` | Homework |
| `QuestLevel`, `QuestProgress` | Quest mode |
| `ParentReview` | Parent reviews |
| `SELData`, `SELReflectionPrompt` | Social-emotional learning |
| `Theme` | 8 story themes |
| `THEME_META` | Emoji + color per theme |
| `LEVEL_NAMES` | Level 1-5 display names |
| `XP_PER_LEVEL` | 200 XP per level |

---

## Styles (`src/styles/`)

| File | Scope |
|------|-------|
| `design-tokens.css` | **Root tokens** — colors, spacing, radii, shadows, typography |
| `global.css` | Base resets and global styles |
| `app-shell.css` | Top-level layout shell |
| `dashboard.css` | Dashboard page (22KB) |
| `generator.css` | Story Generator (79KB — largest) |
| `imm-steps.css` | Immersive stepper wizard (17KB) |
| `reader.css` | BookReader (31KB) |
| `landing.css` | Landing page (20KB) |
| `rewards.css` | Rewards page (13KB) |
| `shelf.css` | Reading Shelf (11KB) |
| `auth.css` | Login/Signup (10KB) |
| `profile.css` | Profile page (8KB) |
| `signup-wizard.css` | Multi-step signup (5KB) |

---

## Lib (`src/lib/`)

### `supabase.ts`
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'readquest-auth',
    storage: window.localStorage,
  },
})
```

Auth state managed via `onAuthStateChange` in `App.tsx` — fires `INITIAL_SESSION` first to avoid login flash.

---

## Image Preloading (App.tsx)

On mount, App.tsx preloads all character gallery images in two phases:
1. **Phase 1 (immediate):** 7 priority characters (SpongeBob, Mickey, Pikachu, Mario, Stitch, Elsa, Simba) + 3 fallback URLs
2. **Phase 2 (idle):** Remaining gallery characters via `requestIdleCallback`
