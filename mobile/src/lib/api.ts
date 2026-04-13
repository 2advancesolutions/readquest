/**
 * api.ts — Axios API client for React Native.
 *
 * Differences from web version:
 * - API_BASE pulled from expo-constants (replaces import.meta.env.VITE_API_URL)
 * - localStorage replaced by AsyncStorage (all reads are now async)
 * - Request interceptor made fully async-safe
 * - All other API logic is identical to the web version
 */
import axios from 'axios'
import { supabase } from './supabase'
import { getSelectedStudentId } from './storage'

const API_BASE = `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000'}/api`

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000, // 3 min default
})

/** Deduplicates concurrent identical calls (TTL: 2s) */
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

// Request interceptor — attach student_id (AsyncStorage on native, identical logic)
api.interceptors.request.use(async (config) => {
  if (config.headers['X-Student-ID']) return config

  // PRIORITY 1: Selected child from AsyncStorage
  const selectedStudentId = await getSelectedStudentId()
  if (selectedStudentId) {
    config.headers['X-Student-ID'] = selectedStudentId
    return config
  }

  // PRIORITY 2: Supabase auth user (parent fallback)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.user?.id) config.headers['X-Student-ID'] = session.user.id
  return config
})

// ── Students ───────────────────────────────────────────────────────────────
export const studentsApi = {
  create: (name: string, grade: number) =>
    api.post('/students', { name, grade_level: grade }),
  get: (id: string) => api.get(`/students/${id}`),
}

// ── Stories ────────────────────────────────────────────────────────────────
export const storiesApi = {
  analyzeCharacter: (character: string, artStyle = 'cartoon') =>
    api.post('/stories/analyze-character', { character, art_style: artStyle }),
  removeBackground: (imageUrl: string) =>
    api.post<{ transparent_url: string }>('/stories/remove-background', { image_url: imageUrl }, { timeout: 60000 }),
  generate: (grade: number, theme: string, character_name: string, language = 'english', artStyle = 'cartoon', is_public = true, character_image_url?: string, character_description?: string) =>
    api.post('/stories/generate',
      { grade, theme, character_name, language, art_style: artStyle, is_public, character_image_url: character_image_url ?? null, character_description: character_description ?? null },
      { timeout: 300000 },
    ),
  // Polling endpoint — returns which page images are ready (Phase 2 progressive loading)
  getStatus: (storyId: string) =>
    api.get<{ cover_ready: boolean; pages: boolean[]; all_ready: boolean }>(`/stories/status/${storyId}`),
  generateBackground: (theme: string, characterName?: string, sceneDescription?: string, characterDescription?: string) =>
    api.post('/stories/generate-background',
      { theme, character_name: characterName ?? null, scene_description: sceneDescription ?? null, character_description: characterDescription ?? null },
      { timeout: 120000 },
    ),
  stylizeDrawing: (imageBase64: string, artStyle = 'cartoon', characterName = '') =>
    api.post<{ portrait_url: string; character_name: string; character_type: string; character_description: string }>(
      '/stories/stylize-drawing',
      { image_base64: imageBase64, art_style: artStyle, character_name: characterName },
      { timeout: 120000 },
    ),
  expandStory: (seedText: string, characterName: string, grade: number) =>
    api.post<{ story: string }>('/stories/expand-story',
      { seed_text: seedText, character_name: characterName, grade },
      { timeout: 45000 },
    ),
  list: () => deduplicate('stories:list', () => api.get('/stories')),
  get:  (id: string) => deduplicate(`stories:${id}`, () => api.get(`/stories/${id}`)),
  delete: (id: string) => api.delete(`/stories/${id}`),
  publicList: (params?: { search?: string; type?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams()
    if (params?.search) qs.set('search', params.search)
    if (params?.type)   qs.set('type',   params.type)
    if (params?.limit)  qs.set('limit',  String(params.limit))
    if (params?.offset) qs.set('offset', String(params.offset))
    const suffix = qs.toString() ? `?${qs}` : ''
    return api.get(`/stories/public${suffix}`)
  },
  publicLike: (storyId: string, sessionKey: string) =>
    fetch(`${API_BASE}/stories/public/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_key: sessionKey, story_id: storyId }),
    }).then(r => r.json()),
  getLikeStatus: (storyId: string, sessionKey: string) =>
    fetch(`${API_BASE}/stories/public/like/${storyId}?session_key=${sessionKey}`).then(r => r.json()),
  getTotalLikes: (studentId: string) =>
    fetch(`${API_BASE}/stories/public/likes/total?student_id=${studentId}`).then(r => r.json()),
  saveStory: (studentId: string, storyId: string) =>
    fetch(`${API_BASE}/stories/public/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, story_id: storyId }),
    }).then(r => r.json()),
  unsaveStory: (studentId: string, storyId: string) =>
    fetch(`${API_BASE}/stories/public/save`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId, story_id: storyId }),
    }).then(r => r.json()),
  getSaveStatus: (studentId: string, storyId: string) =>
    fetch(`${API_BASE}/stories/public/save/${storyId}?student_id=${studentId}`).then(r => r.json()),
  listSaved: (studentId: string) =>
    fetch(`${API_BASE}/stories/public/saved?student_id=${studentId}`).then(r => r.json()),
}

// ── Quizzes ────────────────────────────────────────────────────────────────
export const quizzesApi = {
  submit: (questionId: string, answer: string) =>
    api.post(`/quizzes/${questionId}/submit`, { answer }),
}

// ── Exams ──────────────────────────────────────────────────────────────────
export const examsApi = {
  generate: (grade_level: number, section: string, is_practice = false) =>
    api.post('/exams/generate', { grade_level, section, is_practice }, { timeout: 120000 }),
  submit: (exam_id: string, answers: Record<string, string[]>, time_taken_sec?: number, started_at?: string, is_practice = false) =>
    api.post('/exams/submit', { exam_id, answers, time_taken_sec, started_at, is_practice }),
  history:  () => api.get('/exams/history'),
  scores:   (includePractice = true) => api.get(`/exams/scores?include_practice=${includePractice}`),
  readiness: () => api.get('/exams/readiness'),
  review:   (attempt_id: string) => api.get(`/exams/${attempt_id}/review`),
  resetProgress: (grade_level: number) => api.post('/exams/reset-progress', { grade_level }),
}

// ── Rewards ────────────────────────────────────────────────────────────────
export const rewardsApi = {
  getXP: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.set('start_date', startDate)
    if (endDate)   params.set('end_date',   endDate)
    const qs = params.toString()
    const url = qs ? `/rewards/xp?${qs}` : '/rewards/xp'
    return qs ? api.get(url) : deduplicate('rewards:xp', () => api.get(url))
  },
  getXPHistory:   () => deduplicate('rewards:xp:history', () => api.get('/rewards/xp/history')),
  getBadges:      () => deduplicate('rewards:badges',     () => api.get('/rewards/badges')),
  getStreaks:     () => deduplicate('rewards:streaks',    () => api.get('/rewards/streaks')),
  getLeaderboard: () => deduplicate('rewards:leaderboard',() => api.get('/rewards/leaderboard')),
  recordActivity: () => api.post('/rewards/record-activity'),
  completeStory:  (storyId: string) => api.post(`/rewards/complete-story?story_id=${storyId}`),
  awardXP: (amount: number, idempotencyKey: string) =>
    api.post('/rewards/award-xp', { amount, reason: idempotencyKey, idempotency_key: idempotencyKey }),
  syncXP: (entries: Array<{ story_id: string; total_xp: number }>) =>
    api.post('/rewards/sync-xp', { entries }),
}

// ── Progress ───────────────────────────────────────────────────────────────
export const progressApi = {
  markPageRead:    (storyId: string, pageNumber: number) => api.post(`/stories/${storyId}/pages/${pageNumber}/read`),
  markBookComplete:(storyId: string) => api.post(`/stories/${storyId}/complete`),

  saveProgress: async (storyId: string, lastPage: number, totalPages: number) => {
    // IMPORTANT: Use selected child ID first (matches X-Student-ID in api interceptor)
    const studentId =
      await getSelectedStudentId() ||
      (await supabase.auth.getSession()).data.session?.user?.id ||
      'guest'

    // AsyncStorage for instant offline-first persistence
    const { storage } = await import('./storage')
    const key = `rq_progress_${studentId}_${storyId}`
    const existing = await storage.get<Record<string, unknown>>(key) ?? {}
    await storage.set(key, { ...existing, lastPage, totalPages })

    // Sync to backend (uses service_role key → bypasses RLS)
    try {
      await api.post(`/stories/${storyId}/progress?last_page=${lastPage}&total_pages=${totalPages}`)
    } catch { /* offline — AsyncStorage is the fallback */ }
  },

  getProgressBatch: async (storyIds: string[]): Promise<Record<string, { lastPage: number; totalPages: number; completedAt?: string }>> => {
    if (storyIds.length === 0) return {}
    const studentId =
      await getSelectedStudentId() ||
      (await supabase.auth.getSession()).data.session?.user?.id ||
      'guest'
    const { storage } = await import('./storage')
    const result: Record<string, { lastPage: number; totalPages: number; completedAt?: string }> = {}

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
    } catch {}

    for (const storyId of storyIds) {
      if (result[storyId]) continue
      const local = await storage.get<{ lastPage: number; totalPages: number }>(`rq_progress_${studentId}_${storyId}`)
      if (local) result[storyId] = { lastPage: local.lastPage ?? 0, totalPages: local.totalPages ?? 0 }
    }
    return result
  },

  getProgress: async (storyId: string): Promise<{ lastPage: number; totalPages: number; completedAt?: string } | null> => {
    const batch = await progressApi.getProgressBatch([storyId])
    return batch[storyId] ?? null
  },
}

// ── Reading Logs ───────────────────────────────────────────────────────────
export const readingLogsApi = {
  saveLog: async (log: {
    storyId: string; storyTitle: string; gradeLevel: number; coverUrl?: string
    studentName?: string; readingAccuracy: number; quizScore: number; quizTotal: number
    comprehensionScore: number; totalXp: number; stars: number; feedback: string
  }) => {
    const { data: { session } } = await supabase.auth.getSession()
    const studentId = await getSelectedStudentId() || session?.user?.id || 'guest'
    const { storage } = await import('./storage')
    const record = {
      student_id: studentId, story_id: log.storyId, story_title: log.storyTitle,
      grade_level: log.gradeLevel, cover_url: log.coverUrl ?? null,
      student_name: log.studentName ?? null, reading_accuracy: log.readingAccuracy,
      quiz_score: log.quizScore, quiz_total: log.quizTotal,
      comprehension_score: log.comprehensionScore, total_xp: log.totalXp,
      stars: log.stars, feedback: log.feedback, completed_at: new Date().toISOString(),
    }
    const localKey = `rq_reading_logs_${studentId}`
    const existing = await storage.get<unknown[]>(localKey) ?? []
    existing.unshift(record)
    await storage.set(localKey, existing.slice(0, 100))
    try { await supabase.from('reading_logs').insert(record) } catch {}
    rewardsApi.awardXP(log.totalXp, `reading_log_${log.storyId}`).catch(() => {})
  },

  getLogs: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const studentId = await getSelectedStudentId() || session?.user?.id || 'guest'
    return readingLogsApi.getLogsForStudent(studentId)
  },

  getLogsForStudent: async (studentId: string, studentName?: string, gradeLevel?: number) => {
    const { data: { session } } = await supabase.auth.getSession()
    const parentUUID = session?.user?.id
    const { storage } = await import('./storage')
    try {
      const orParts: string[] = [`student_id.eq.${studentId}`]
      if (parentUUID && parentUUID !== studentId) {
        if (studentName)          orParts.push(`and(student_id.eq.${parentUUID},student_name.eq.${studentName})`)
        if (gradeLevel !== undefined) orParts.push(`and(student_id.eq.${parentUUID},grade_level.eq.${gradeLevel})`)
      }
      const { data, error } = await supabase
        .from('reading_logs').select('*')
        .or(orParts.join(','))
        .order('completed_at', { ascending: false }).limit(100)
      if (!error && data && data.length > 0) return data
    } catch {}

    // AsyncStorage fallback
    const keys = await storage.getKeysWithPrefix('rq_reading_logs_')
    const allLogs: unknown[] = []
    const seen = new Set<string>()
    for (const key of keys) {
      const entries = await storage.get<Array<Record<string, unknown>>>(key) ?? []
      for (const entry of entries) {
        if (gradeLevel !== undefined && entry.grade_level !== undefined && entry.grade_level !== gradeLevel) continue
        if (studentName && entry.student_name && entry.student_name !== studentName) continue
        const id = `${entry.story_id}${entry.completed_at}`
        if (!seen.has(id)) { seen.add(id); allLogs.push(entry) }
      }
    }
    return (allLogs as Array<Record<string, string>>).sort((a, b) =>
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    )
  },
}

// ── Spelling ───────────────────────────────────────────────────────────────
export const spellingApi = {
  getWords: (studentId: string, limit = 10) =>
    api.get<SpellingWordOut[]>(`/spelling/words?limit=${limit}`, { headers: { 'X-Student-ID': studentId } }),
  getGradeWords: (studentId: string, limit = 10, grade?: number) =>
    api.get<SpellingWordOut[]>(
      `/spelling/grade-words?limit=${limit}${grade !== undefined ? `&grade=${grade}` : ''}`,
      { headers: { 'X-Student-ID': studentId } },
    ),
  createSession: (studentId: string, characterName: string, totalWords = 10) =>
    api.post<{ session_id: string }>('/spelling/sessions',
      { character_name: characterName, total_words: totalWords },
      { headers: { 'X-Student-ID': studentId } },
    ),
  submitAttempt: (studentId: string, sessionId: string, word: string, gameMode: 'bee' | 'blanks' | 'scramble', studentAnswer: string, attemptNumber = 1) =>
    api.post<AttemptResultOut>('/spelling/attempts',
      { session_id: sessionId, word, game_mode: gameMode, student_answer: studentAnswer, attempt_number: attemptNumber },
      { headers: { 'X-Student-ID': studentId } },
    ),
  getStats:   (studentId: string) => api.get<SpellingStatsOut>('/spelling/stats',   { headers: { 'X-Student-ID': studentId } }),
  getHistory: (studentId: string) => api.get<SpellingSessionOut[]>('/spelling/history', { headers: { 'X-Student-ID': studentId } }),
}

// ── Game Progress ──────────────────────────────────────────────────────────
export const gameProgressApi = {
  upsert: (studentId: string, gameId: string, gradeLevel: number, level: number, stars: number) =>
    api.post<GameProgressOut>('/game-progress', { game_id: gameId, grade_level: gradeLevel, level, stars }, { headers: { 'X-Student-ID': studentId } }),
  getAll: (studentId: string) =>
    api.get<GameProgressOut[]>('/game-progress', { headers: { 'X-Student-ID': studentId } }),
}

// ── Roadmap ────────────────────────────────────────────────────────────────
export const roadmapApi = {
  get: (studentId: string) =>
    api.get<RoadmapOut>('/roadmap', { headers: { 'X-Student-ID': studentId } }),
}

// ── Types ──────────────────────────────────────────────────────────────────
export interface SpellingWordOut { word: string; definition?: string; example_sentence?: string; source: 'error' | 'vocabulary' | 'grade'; mastered: boolean }
export interface AttemptResultOut { is_correct: boolean; correct_answer: string; mastered: boolean; newly_mastered: boolean; xp_awarded: number }
export interface SpellingStatsOut { total_sessions: number; words_mastered: number; total_attempts: number; correct_attempts: number; accuracy_pct: number }
export interface SpellingSessionOut { session_id: string; character_name: string; total_words: number; correct_count: number; accuracy_pct: number; xp_earned: number; completed_at: string | null; started_at: string | null; missed_words: string[] }
export interface GameProgressOut { game_id: string; grade_level: number; level: number; stars: number; updated_at?: string }
export interface RoadmapCategoryOut { pct: number; label: string; detail: string }
export interface RoadmapGameItem { id: string; title: string; emoji: string; level: number; max_level: number; pct: number; stars: number }
export interface SmartSuggestionOut { area: string; emoji: string; pct: number; message: string; action_url: string }
export interface RoadmapOut { reading: RoadmapCategoryOut; quizzes: RoadmapCategoryOut; comprehension: RoadmapCategoryOut; spelling: RoadmapCategoryOut; exams: RoadmapCategoryOut; games: { overall_pct: number; breakdown: RoadmapGameItem[] }; smart_suggestion: SmartSuggestionOut }

// ── Subscription & Tokens ──────────────────────────────────────────────────
export const subscriptionApi = {
  /** Returns the parent's active plan + usage from v_parent_usage view.
   *  Auto-seeds new users onto the Spark plan so the badge always appears. */
  getUsage: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return null

    const { data } = await supabase
      .from('v_parent_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (data) return data as ParentUsage

    // ── No active subscription — auto-enroll on Spark (free onboarding) ──
    const SPARK_PLAN_ID = 'eccc4590-a6d9-431d-8255-055436b42ef1'
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    await supabase.from('user_subscriptions').insert({
      user_id: userId,
      plan_id: SPARK_PLAN_ID,
      status:  'active',
      current_period_start: start,
      current_period_end:   end,
      stories_used_this_period:     0,
      characters_used_this_period:  0,
    })

    // Re-query so we return the freshly joined view row
    const { data: seeded } = await supabase
      .from('v_parent_usage')
      .select('*')
      .eq('user_id', userId)
      .single()

    return seeded as ParentUsage | null
  },
  /** List all subscription plans */
  getPlans: async () => {
    const { data } = await supabase
      .from('subscription_plans')
      .select('*')
      .order('sort_order')
    return (data ?? []) as SubscriptionPlan[]
  },
  /** Buy tokens — $5 = 6 stories */
  buyTokens: (packId: string) => api.post('/subscriptions/buy-tokens', { pack_id: packId }),

  /** Switch active plan immediately — updates user_subscriptions directly in Supabase */
  changePlan: async (planId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) return { success: false, error: 'Not logged in' }

      // Check if user already has a subscription row
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .single()

      if (existing?.id) {
        // Update existing subscription — reset period counters
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            updated_at: new Date().toISOString(),
            stories_used_this_period: 0,
            characters_used_this_period: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: (() => {
              const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return d.toISOString()
            })(),
          })
          .eq('id', existing.id)
        if (error) { console.error('[changePlan] update error:', error); return { success: false, error: error.message } }
      } else {
        // Insert new subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            status: 'active',
            current_period_start: new Date(new Date().setDate(1)).toISOString(),
            current_period_end: (() => {
              const d = new Date(); d.setMonth(d.getMonth() + 1, 1); return d.toISOString()
            })(),
          })
        if (error) return { success: false, error: error.message }
      }
      return { success: true }
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Unknown error' }
    }
  },
}

export interface ParentUsage {
  user_id: string; plan_name: string; plan_slug: string; price_cents: number
  stories_limit: number; stories_used_this_period: number; characters_used_this_period: number
  stories_remaining: number; token_balance: number; current_period_end: string
}
export interface SubscriptionPlan {
  id: string; name: string; slug: string; price_cents: number
  tokens_included: number; features: string[]; is_popular: boolean; sort_order: number
}

export default api
