import axios from 'axios';
import { supabase } from '../lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000, // 3 min for normal API calls
});

/** Deduplicates concurrent identical calls — same key shares one in-flight promise (TTL: 2 s). */
const _cache = new Map<string, { promise: Promise<unknown>; ts: number }>()
function deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = _cache.get(key)
  if (hit && now - hit.ts < 2000) return hit.promise as Promise<T>
  const promise = fn()
  _cache.set(key, { promise: promise as Promise<unknown>, ts: now })
  promise.finally(() => setTimeout(() => _cache.delete(key), 2000))
  return promise
}


// Request interceptor — attach student_id from localStorage (selected child) or Supabase session (parent fallback)
// Does NOT overwrite if already explicitly set (e.g. a specific child's UUID from the story generator)
api.interceptors.request.use(async (config) => {
  // If the caller already set X-Student-ID explicitly, respect it
  if (config.headers['X-Student-ID']) return config;

  // PRIORITY 1: Use the selected child's student ID from localStorage (set when parent picks a child on dashboard)
  const selectedStudentId = localStorage.getItem('readquest_student_id');
  if (selectedStudentId) {
    config.headers['X-Student-ID'] = selectedStudentId;
    return config;
  }

  // PRIORITY 2: Fall back to the Supabase auth user (parent's UUID) if no child is selected
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) config.headers['X-Student-ID'] = session.user.id;
  return config;
});

export const studentsApi = {
  create: (name: string, grade: number) =>
    api.post('/students', { name, grade_level: grade }),
  get: (id: string) => api.get(`/students/${id}`),
};

export const storiesApi = {
  analyzeCharacter: (character: string) =>
    api.post('/stories/analyze-character', { character }),
  removeBackground: (imageUrl: string) =>
    api.post<{ transparent_url: string }>('/stories/remove-background', { image_url: imageUrl }, { timeout: 60000 }),
  generate: (grade: number, theme: string, character_name: string, language = 'english', artStyle = 'cartoon', is_public = false) =>
    api.post('/stories/generate',
      { grade, theme, character_name, language, art_style: artStyle, is_public },
      { timeout: 300000 },
    ),
  generateBackground: (theme: string, characterName?: string, sceneDescription?: string, characterDescription?: string) =>
    api.post('/stories/generate-background',
      { theme, character_name: characterName ?? null, scene_description: sceneDescription ?? null, character_description: characterDescription ?? null },
      { timeout: 120000 }), // 2 min — allow for cold-start + image generation on mobile
  list: () => deduplicate('stories:list', () => api.get('/stories')),
  get: (id: string) => deduplicate(`stories:${id}`, () => api.get(`/stories/${id}`)),
  delete: (id: string) => api.delete(`/stories/${id}`),
  /** Fetch publicly listed books — no auth required. Supports search & type filter. */
  publicList: (params?: { search?: string; type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.type) qs.set('type', params.type)
    if (params?.limit) qs.set('limit', String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get(`/stories/public${suffix}`)
  },
  /** Like a story once per session. */
  publicLike: (storyId: string, sessionKey: string) =>
    fetch('/api/stories/public/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_key: sessionKey, story_id: storyId }),
    }).then(r => r.json()),
  /** Get like status for a story. */
  getLikeStatus: (storyId: string, sessionKey: string) =>
    fetch(`/api/stories/public/like/${storyId}?session_key=${sessionKey}`).then(r => r.json()),
  /** Get total likes received by a student's books. */
  getTotalLikes: (studentId: string) =>
    fetch(`/api/stories/public/likes/total?student_id=${studentId}`).then(r => r.json()),
  /** Save a community book to a student's library. */
  saveStory: (studentId: string, storyId: string) =>
    fetch('/api/stories/public/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, story_id: storyId }),
    }).then(r => r.json()),
  /** Remove a saved book from a student's library. */
  unsaveStory: (studentId: string, storyId: string) =>
    fetch('/api/stories/public/save', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, story_id: storyId }),
    }).then(r => r.json()),
  /** Check if a story is saved by this student. */
  getSaveStatus: (studentId: string, storyId: string) =>
    fetch(`/api/stories/public/save/${storyId}?student_id=${studentId}`).then(r => r.json()),
  /** List all community books saved to a student's library. */
  listSaved: (studentId: string) =>
    fetch(`/api/stories/public/saved?student_id=${studentId}`).then(r => r.json()),
};

export const quizzesApi = {
  submit: (questionId: string, answer: string) =>
    api.post(`/quizzes/${questionId}/submit`, { answer }),
};

export const examsApi = {
  /** Generate a fresh exam — full (30Q/30min) or practice (15Q/10min) */
  generate: (grade_level: number, section: string, is_practice = false) =>
    api.post('/exams/generate', { grade_level, section, is_practice }, { timeout: 120000 }),
  /** Submit all answers at once — returns full scored results */
  submit: (
    exam_id: string,
    answers: Record<string, string[]>,
    time_taken_sec?: number,
    started_at?: string,
    is_practice = false,
  ) =>
    api.post('/exams/submit', { exam_id, answers, time_taken_sec, started_at, is_practice }),
  /** Get all past exam attempts for this student (excludes practice by default on /history) */
  history: () => api.get('/exams/history'),
  /** Get ALL scores including practice tests — the full permanent score log */
  scores: (includePractice = true) =>
    api.get(`/exams/scores?include_practice=${includePractice}`),
  /** Get grade readiness status */
  readiness: () => api.get('/exams/readiness'),
  /** Review a specific past attempt with full answer breakdown */
  review: (attempt_id: string) => api.get(`/exams/${attempt_id}/review`),
  /** Reset all (non-practice) exam progress for a grade — starts all over */
  resetProgress: (grade_level: number) =>
    api.post('/exams/reset-progress', { grade_level }),
};


export const rewardsApi = {
  getXP: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate)   params.set('end_date',   endDate)
    const qs = params.toString()
    const url = qs ? `/rewards/xp?${qs}` : '/rewards/xp'
    // Bypass deduplication when date params vary so new selections always refetch
    return qs ? api.get(url) : deduplicate('rewards:xp', () => api.get(url))
  },
  getXPHistory: () => deduplicate('rewards:xp:history', () => api.get('/rewards/xp/history')),
  getBadges: () => deduplicate('rewards:badges', () => api.get('/rewards/badges')),
  getStreaks: () => deduplicate('rewards:streaks', () => api.get('/rewards/streaks')),
  getLeaderboard: () => deduplicate('rewards:leaderboard', () => api.get('/rewards/leaderboard')),
  /** Record that the student read today — updates streak + weekly activity */
  recordActivity: () => api.post('/rewards/record-activity'),
  /** Mark a story fully completed */
  completeStory: (storyId: string) => api.post(`/rewards/complete-story?story_id=${storyId}`),
  /** Award a specific XP amount with idempotency — safe to call multiple times */
  awardXP: (amount: number, idempotencyKey: string) =>
    api.post('/rewards/award-xp', { amount, reason: idempotencyKey, idempotency_key: idempotencyKey }),
  /** Backfill XP ledger from a list of reading log entries — call on page load */
  syncXP: (entries: Array<{ story_id: string; total_xp: number }>) =>
    api.post('/rewards/sync-xp', { entries }),
};


export const progressApi = {
  markPageRead: (storyId: string, pageNumber: number) =>
    api.post(`/stories/${storyId}/pages/${pageNumber}/read`),
  markBookComplete: (storyId: string) =>
    api.post(`/stories/${storyId}/complete`),

  /** Save the last page the student read (for resume + progress bar). */
  saveProgress: async (storyId: string, lastPage: number, totalPages: number) => {
    const studentId =
      (await supabase.auth.getSession()).data.session?.user?.id ||
      localStorage.getItem('readquest_student_id') ||
      'guest'

    // 1. Always persist to localStorage for instant access
    const key = `rq_progress_${studentId}_${storyId}`
    const existing = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({ ...existing, lastPage, totalPages }))

    // 2. Sync to Supabase for cross-device persistence
    try {
      await supabase.from('reading_progress').upsert({
        student_id: studentId,
        story_id: storyId,
        last_page: lastPage,
        total_pages: totalPages,
      }, { onConflict: 'student_id,story_id' })
    } catch (_) { /* offline or table not created yet — localStorage is the fallback */ }
  },

  /** Load progress for ALL stories in one query — use this instead of calling getProgress per-story. */
  getProgressBatch: async (storyIds: string[]): Promise<Record<string, { lastPage: number; totalPages: number; completedAt?: string }>> => {
    if (storyIds.length === 0) return {}
    const studentId =
      (await supabase.auth.getSession()).data.session?.user?.id ||
      localStorage.getItem('readquest_student_id') ||
      'guest'

    const result: Record<string, { lastPage: number; totalPages: number; completedAt?: string }> = {}

    // Single batch query for all stories at once
    try {
      const { data } = await supabase
        .from('reading_progress')
        .select('story_id,last_page,total_pages,completed_at')
        .eq('student_id', studentId)
        .in('story_id', storyIds)
      if (data) {
        for (const row of data) {
          result[row.story_id] = { lastPage: row.last_page ?? 0, totalPages: row.total_pages ?? 0, completedAt: row.completed_at }
        }
      }
    } catch (_) {}

    // Fill any misses from localStorage
    for (const storyId of storyIds) {
      if (result[storyId]) continue
      const local = JSON.parse(localStorage.getItem(`rq_progress_${studentId}_${storyId}`) || 'null')
      if (local) result[storyId] = { lastPage: local.lastPage ?? 0, totalPages: local.totalPages ?? 0 }
    }

    return result
  },

  /** Load progress for a single story. Prefer getProgressBatch when loading many stories. */
  getProgress: async (storyId: string): Promise<{ lastPage: number; totalPages: number; completedAt?: string } | null> => {
    const batch = await progressApi.getProgressBatch([storyId])
    return batch[storyId] ?? null
  },
};

export const readingLogsApi = {
  /** Save a completed reading session to Supabase (and localStorage as fallback). */
  saveLog: async (log: {
    storyId: string
    storyTitle: string
    gradeLevel: number
    coverUrl?: string
    studentName?: string
    readingAccuracy: number
    quizScore: number
    quizTotal: number
    comprehensionScore: number
    totalXp: number
    stars: number
    feedback: string
  }) => {
    const { data: { session } } = await supabase.auth.getSession()
    const studentId = localStorage.getItem('readquest_student_id') || session?.user?.id || 'guest'
    const record = {
      student_id: studentId,
      story_id: log.storyId,
      story_title: log.storyTitle,
      grade_level: log.gradeLevel,
      cover_url: log.coverUrl ?? null,
      student_name: log.studentName ?? null,
      reading_accuracy: log.readingAccuracy,
      quiz_score: log.quizScore,
      quiz_total: log.quizTotal,
      comprehension_score: log.comprehensionScore,
      total_xp: log.totalXp,
      stars: log.stars,
      feedback: log.feedback,
      completed_at: new Date().toISOString(),
    }
    // Save to localStorage always (instant, works offline)
    const localKey = `rq_reading_logs_${studentId}`
    const existing: unknown[] = JSON.parse(localStorage.getItem(localKey) || '[]')
    existing.unshift(record)
    localStorage.setItem(localKey, JSON.stringify(existing.slice(0, 100)))
    // Sync to Supabase
    try {
      await supabase.from('reading_logs').insert(record)
    } catch (_) { /* table may not exist yet — localStorage is the fallback */ }
    // Award XP to the correct student in the XP ledger (idempotent)
    rewardsApi.awardXP(log.totalXp, `reading_log_${log.storyId}`).catch(() => {})
  },

  /** Load all completed readings for this student, newest first. */
  getLogs: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const studentId = localStorage.getItem('readquest_student_id') || session?.user?.id || 'guest'
    return readingLogsApi.getLogsForStudent(studentId)
  },

  /** Load completed readings for an explicit student ID, newest first.
   *  Single OR query covers: real student ID, parent UUID + name, parent UUID + grade. */
  getLogsForStudent: async (studentId: string, studentName?: string, gradeLevel?: number) => {
    const { data: { session } } = await supabase.auth.getSession()
    const parentUUID = session?.user?.id

    try {
      // Build OR filters: exact student ID always included; parent-UUID variants when available
      const orParts: string[] = [`student_id.eq.${studentId}`]
      if (parentUUID && parentUUID !== studentId) {
        if (studentName) orParts.push(`and(student_id.eq.${parentUUID},student_name.eq.${studentName})`)
        if (gradeLevel !== undefined) orParts.push(`and(student_id.eq.${parentUUID},grade_level.eq.${gradeLevel})`)
      }

      const { data, error } = await supabase
        .from('reading_logs').select('*')
        .or(orParts.join(','))
        .order('completed_at', { ascending: false }).limit(100)

      if (!error && data && data.length > 0) return data
    } catch (_) {}

    // Layer 4: localStorage — scan all rq_reading_logs_* keys, filter strictly by grade_level
    const allLogs: unknown[] = []
    const seen = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) ?? ''
      if (!key.startsWith('rq_reading_logs_')) continue
      try {
        const entries = JSON.parse(localStorage.getItem(key) || '[]') as Array<Record<string, unknown>>
        for (const entry of entries) {
          // Filter by grade_level (most reliable — name may be null, id may be wrong)
          if (gradeLevel !== undefined && entry.grade_level !== undefined && entry.grade_level !== gradeLevel) continue
          // Also filter by name if available
          if (studentName && entry.student_name && entry.student_name !== studentName) continue
          const id = `${entry.story_id}${entry.completed_at}`
          if (!seen.has(id)) { seen.add(id); allLogs.push(entry) }
        }
      } catch (_) {}
    }
    return (allLogs as Array<Record<string, string>>).sort((a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    )
  },
}

// ── Spelling Arena API ─────────────────────────────────────────────────────
export const spellingApi = {
  getWords: (studentId: string, limit = 10) =>
    api.get<SpellingWordOut[]>(`/spelling/words?limit=${limit}`, {
      headers: { 'X-Student-ID': studentId },
    }),

  getGradeWords: (studentId: string, limit = 10, grade?: number) =>
    api.get<SpellingWordOut[]>(
      `/spelling/grade-words?limit=${limit}${grade !== undefined ? `&grade=${grade}` : ''}`,
      { headers: { 'X-Student-ID': studentId } },
    ),

  createSession: (studentId: string, characterName: string, totalWords = 10) =>
    api.post<{ session_id: string }>('/spelling/sessions', {
      character_name: characterName,
      total_words: totalWords,
    }, { headers: { 'X-Student-ID': studentId } }),

  submitAttempt: (
    studentId: string,
    sessionId: string,
    word: string,
    gameMode: 'bee' | 'blanks' | 'scramble',
    studentAnswer: string,
    attemptNumber = 1,
  ) =>
    api.post<AttemptResultOut>('/spelling/attempts', {
      session_id: sessionId,
      word,
      game_mode: gameMode,
      student_answer: studentAnswer,
      attempt_number: attemptNumber,
    }, { headers: { 'X-Student-ID': studentId } }),

  getStats: (studentId: string) =>
    api.get<SpellingStatsOut>('/spelling/stats', {
      headers: { 'X-Student-ID': studentId },
    }),

  getHistory: (studentId: string) =>
    api.get<SpellingSessionOut[]>('/spelling/history', {
      headers: { 'X-Student-ID': studentId },
    }),
}

// ── Spelling API types ─────────────────────────────────────────────────────
export interface SpellingWordOut {
  word: string
  definition?: string
  example_sentence?: string
  source: 'error' | 'vocabulary' | 'grade'
  mastered: boolean
}

export interface AttemptResultOut {
  is_correct: boolean
  correct_answer: string
  mastered: boolean
  newly_mastered: boolean
  xp_awarded: number
}

export interface SpellingStatsOut {
  total_sessions: number
  words_mastered: number
  total_attempts: number
  correct_attempts: number
  accuracy_pct: number
}

export interface SpellingSessionOut {
  session_id: string
  character_name: string
  total_words: number
  correct_count: number
  accuracy_pct: number
  xp_earned: number
  completed_at: string | null
  started_at: string | null
  missed_words: string[]   // words the student got wrong in this session
}


// ── Game Progress API ──────────────────────────────────────────────────────
export const gameProgressApi = {
  /** Save or update a student's level/stars for a game at a grade level. */
  upsert: (studentId: string, gameId: string, gradeLevel: number, level: number, stars: number) =>
    api.post<GameProgressOut>('/game-progress', { game_id: gameId, grade_level: gradeLevel, level, stars }, {
      headers: { 'X-Student-ID': studentId },
    }),

  /** Load all game progress records for the current student. */
  getAll: (studentId: string) =>
    api.get<GameProgressOut[]>('/game-progress', {
      headers: { 'X-Student-ID': studentId },
    }),
}

export interface GameProgressOut {
  game_id: string
  grade_level: number
  level: number
  stars: number
  updated_at?: string
}

// ── Roadmap API ────────────────────────────────────────────────────────────
export interface RoadmapCategoryOut {
  pct: number
  label: string
  detail: string
}

export interface RoadmapGameItem {
  id: string
  title: string
  emoji: string
  level: number
  max_level: number
  pct: number
  stars: number
}

export interface SmartSuggestionOut {
  area: string
  emoji: string
  pct: number
  message: string
  action_url: string
}

export interface RoadmapOut {
  reading: RoadmapCategoryOut
  quizzes: RoadmapCategoryOut
  comprehension: RoadmapCategoryOut
  spelling: RoadmapCategoryOut
  exams: RoadmapCategoryOut
  games: { overall_pct: number; breakdown: RoadmapGameItem[] }
  smart_suggestion: SmartSuggestionOut
}

export const roadmapApi = {
  get: (studentId: string) =>
    api.get<RoadmapOut>('/roadmap', { headers: { 'X-Student-ID': studentId } }),
}

export default api;
