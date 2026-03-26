import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { readingLogsApi, rewardsApi, storiesApi, progressApi } from '../services/api'
import '../styles/shelf.css'
import '../styles/app-shell.css'

interface Child { id: string; name: string; grade_level: number }

interface ReadingLog {
  story_id: string
  story_title: string
  grade_level: number
  cover_url?: string
  reading_accuracy: number
  quiz_score: number
  quiz_total: number
  comprehension_score: number
  total_xp: number
  stars: number
  feedback: string
  completed_at: string
}

interface Story {
  id: string
  title: string
  grade_level: number
  cover_media_url?: string
  theme?: string
  pages?: { id: string }[]
}

interface ShelfEntry {
  storyId: string
  title: string
  gradeLevel: number
  coverUrl?: string
  theme?: string
  // Progress from reading_progress table
  lastPage: number
  totalPages: number
  completionPct: number
  // From reading log (null if not yet completed/passed)
  log: ReadingLog | null
  completed: boolean   // passed 77%
}

const GRADE_COLORS: Record<number, string> = {
  1: '#F59E0B', 2: '#10B981', 3: '#3B82F6', 4: '#8B5CF6',
  5: '#EC4899', 6: '#F97316', 7: '#06B6D4', 8: '#6366F1',
}
const COVER_FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #FDA4AF, #FB7185)',
  'linear-gradient(135deg, #86EFAC, #4ADE80)',
  'linear-gradient(135deg, #7DD3FC, #38BDF8)',
  'linear-gradient(135deg, #C4B5FD, #A78BFA)',
  'linear-gradient(135deg, #FDE68A, #FCD34D)',
  'linear-gradient(135deg, #F9A8D4, #F472B6)',
  'linear-gradient(135deg, #6EE7B7, #34D399)',
  'linear-gradient(135deg, #93C5FD, #60A5FA)',
]
const COVER_EMOJIS = ['📖', '📚', '⭐', '🌟', '🦋', '🌈', '🔮', '🦄']

function StarRating({ count }: { count: number }) {
  return (
    <div className="shelf-stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`shelf-star ${i <= count ? 'lit' : ''}`}>★</span>
      ))}
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '' }
}

/* ─── Per-student shelf panel ─────────────────────────────────────── */
function StudentShelf({ child }: { child: Child }) {
  const navigate = useNavigate()
  const [entries, setEntries]     = useState<ShelfEntry[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setExpanded(null)

    const prevId = localStorage.getItem('readquest_student_id')
    localStorage.setItem('readquest_student_id', child.id)

    Promise.all([
      readingLogsApi.getLogsForStudent(child.id, child.name, child.grade_level)
        .catch(() => [] as ReadingLog[]),
      storiesApi.list().then(r => (r.data ?? []) as Story[]).catch(() => [] as Story[]),
    ]).then(async ([logs, stories]) => {
      const typedLogs = logs as ReadingLog[]

      // Build a map of the best log per story (highest stars)
      const logMap = new Map<string, ReadingLog>()
      for (const log of typedLogs) {
        const existing = logMap.get(log.story_id)
        if (!existing || log.stars > existing.stars) logMap.set(log.story_id, log)
      }

      // Fetch progress for ALL stories in ONE batch query
      const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
      const progressMap = await progressApi.getProgressBatch(stories.map(s => s.id)).catch(() => ({} as Record<string, never>))

      const built: ShelfEntry[] = []
      stories.forEach((story) => {
        const prog = progressMap[story.id] ?? null
        const log  = logMap.get(story.id) ?? null
        const lastPage  = prog?.lastPage  ?? 0
        const totalPages = prog?.totalPages ?? (story.pages?.length ?? 0)
        const completionPct = totalPages > 0 ? Math.round((lastPage / totalPages) * 100) : 0
        const completed = !!prog?.completedAt || !!log
        const hasInteraction = lastPage > 0 || !!log

        // Only show stories the student has actually touched OR completed
        if (!hasInteraction && !completed) return

        const rawCover = story.cover_media_url
        const coverUrl = rawCover
          ? (rawCover.startsWith('/static') ? `${API_BASE}${rawCover}` : rawCover)
          : log?.cover_url

        built.push({
          storyId: story.id,
          title: story.title,
          gradeLevel: story.grade_level,
          coverUrl,
          theme: story.theme,
          lastPage,
          totalPages,
          completionPct,
          log,
          completed,
        })
      })

      // Completed first, then in-progress by % desc
      built.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? -1 : 1
        return b.completionPct - a.completionPct
      })

      setEntries(built)

      // Backfill XP if we have logs
      if (typedLogs.length > 0) {
        rewardsApi.syncXP(
          typedLogs.map(l => ({ story_id: l.story_id, total_xp: l.total_xp }))
        ).catch(() => {})
      }
    }).finally(() => {
      if (prevId) localStorage.setItem('readquest_student_id', prevId)
      else localStorage.removeItem('readquest_student_id')
      setLoading(false)
    })
  }, [child.id, child.name, child.grade_level])

  const completedEntries = entries.filter(e => e.completed)
  const totalXp  = completedEntries.reduce((s, e) => s + (e.log?.total_xp ?? 0), 0)
  const avgAcc   = completedEntries.length
    ? Math.round(completedEntries.reduce((s, e) => s + (e.log?.reading_accuracy ?? 0), 0) / completedEntries.length)
    : 0
  const avgStars = completedEntries.length
    ? (completedEntries.reduce((s, e) => s + (e.log?.stars ?? 0), 0) / completedEntries.length).toFixed(1)
    : '—'

  return (
    <div className="shelf-student-panel">
      {/* Mini stats — only if something completed */}
      {completedEntries.length > 0 && (
        <motion.div className="shelf-stats"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="shelf-stat-pill">
            <span className="shelf-stat-icon">📚</span>
            <span className="shelf-stat-val">{completedEntries.length}</span>
            <span className="shelf-stat-lbl">Completed</span>
          </div>
          <div className="shelf-stat-pill">
            <span className="shelf-stat-icon">⚡</span>
            <span className="shelf-stat-val">{totalXp}</span>
            <span className="shelf-stat-lbl">Total XP</span>
          </div>
          <div className="shelf-stat-pill">
            <span className="shelf-stat-icon">🎯</span>
            <span className="shelf-stat-val">{avgAcc}%</span>
            <span className="shelf-stat-lbl">Avg Accuracy</span>
          </div>
          <div className="shelf-stat-pill">
            <span className="shelf-stat-icon">⭐</span>
            <span className="shelf-stat-val">{avgStars}</span>
            <span className="shelf-stat-lbl">Avg Stars</span>
          </div>
        </motion.div>
      )}

      {/* Book grid */}
      {loading ? (
        <div className="shelf-grid">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="shelf-skeleton" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <motion.div className="shelf-empty"
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
          <div className="shelf-empty-art">
            <div className="shelf-empty-shelf">
              <div className="shelf-empty-book" style={{ background: '#FDA4AF' }} />
              <div className="shelf-empty-book" style={{ background: '#86EFAC', height: 90 }} />
              <div className="shelf-empty-book" style={{ background: '#7DD3FC', height: 75 }} />
            </div>
            <div className="shelf-empty-icon">📭</div>
          </div>
          <h2>No books yet!</h2>
          <p>{child.name} hasn't started a story yet. Go read one! 🚀</p>
          <motion.button className="shelf-cta"
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/generate')}>
            ✨ Start Reading
          </motion.button>
        </motion.div>
      ) : (
        <div className="shelf-grid">
          <AnimatePresence>
            {entries.map((entry, i) => {
              const isOpen = expanded === entry.storyId
              const badgeColor = GRADE_COLORS[entry.gradeLevel] ?? '#8B5CF6'
              const fallbackGrad = COVER_FALLBACK_GRADIENTS[i % COVER_FALLBACK_GRADIENTS.length]
              const fallbackEmoji = COVER_EMOJIS[i % COVER_EMOJIS.length]

              return (
                <motion.div key={entry.storyId}
                  className={`shelf-card ${isOpen ? 'expanded' : ''}`}
                  initial={{ opacity: 0, y: 32, scale: 0.93 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: i * 0.06, type: 'spring', stiffness: 240, damping: 22 }}
                  onClick={() => setExpanded(isOpen ? null : entry.storyId)}>

                  {/* Cover */}
                  <div className="shelf-cover-wrapper">
                    <div className="shelf-cover">
                      {entry.coverUrl ? (
                        <img src={entry.coverUrl} alt={entry.title} className="shelf-cover-img"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      ) : (
                        <div className="shelf-cover-fallback" style={{ background: fallbackGrad }}>
                          <span className="shelf-cover-emoji">{fallbackEmoji}</span>
                        </div>
                      )}
                      <div className="shelf-grade-badge" style={{ color: badgeColor }}>
                        <span className="badge-lbl">Grade</span>
                        <span className="badge-val">{entry.gradeLevel}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="shelf-body">
                    <h3 className="shelf-book-title">{entry.title}</h3>

                    {/* Completion progress bar */}
                    <div className="shelf-progress-row">
                      <span className="shelf-progress-label">
                        {entry.completed ? '✅ Completed' : `${entry.completionPct}% read`}
                      </span>
                      <div className="shelf-progress-track">
                        <motion.div
                          className={`shelf-progress-fill ${entry.completed ? 'complete' : 'in-progress'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${entry.completed ? 100 : entry.completionPct}%` }}
                          transition={{ duration: 0.7, delay: i * 0.04 }} />
                      </div>
                    </div>

                    {entry.log && (
                      <div className="shelf-stars-row"><StarRating count={entry.log.stars} /></div>
                    )}

                    {entry.log && (
                      <div className="shelf-chips">
                        <div className="shelf-chip">
                          <span className="chip-val">{entry.log.reading_accuracy}%</span>
                          <span className="chip-lbl">Read</span>
                        </div>
                        <div className="shelf-chip">
                          <span className="chip-val">{entry.log.quiz_total > 0 ? `${entry.log.quiz_score}/${entry.log.quiz_total}` : '—'}</span>
                          <span className="chip-lbl">Quiz</span>
                        </div>
                        <div className="shelf-chip">
                          <span className="chip-val">{entry.log.total_xp}</span>
                          <span className="chip-lbl">XP</span>
                        </div>
                      </div>
                    )}

                    {/* Keep Reading / Read Again button */}
                    {!entry.completed && (
                      <motion.button
                        className="shelf-keep-reading-btn"
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                        onClick={e => { e.stopPropagation(); navigate(`/read/${entry.storyId}`) }}>
                        {entry.completionPct > 0 ? '📖 Keep Reading' : '🚀 Start Reading'}
                      </motion.button>
                    )}

                    <AnimatePresence>
                      {isOpen && entry.log && (
                        <motion.div className="shelf-detail"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}>
                          <div className="shelf-detail-inner">
                            <div className="shelf-comp-row-hdr">
                              <h4 className="shelf-detail-header">Comprehension</h4>
                              <span className="shelf-comp-pct">{entry.log.comprehension_score}%</span>
                            </div>
                            <div className="shelf-comp-track">
                              <motion.div className="shelf-comp-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${entry.log.comprehension_score}%` }}
                                transition={{ duration: 0.7, delay: 0.1 }} />
                            </div>
                            {entry.log.feedback && (
                              <>
                                <h4 className="shelf-detail-header mt-2">Teacher note</h4>
                                <div className="shelf-feedback-bubble">
                                  <span className="shelf-feedback-quote">"</span>
                                  {entry.log.feedback}
                                </div>
                              </>
                            )}
                            <div className="shelf-date">📅 {formatDate(entry.log.completed_at)}</div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="shelf-toggle-hint">{isOpen ? '▲ less' : '▼ details'}</div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}


/* ─── Sidebar shared component ─────────────────────────────────── */
function AppSidebar({ active }: { active: string }) {
  const navigate = useNavigate()
  const handleLogout = useCallback(() => {
    localStorage.clear()
    supabase.auth.signOut()
    navigate('/')
  }, [navigate])
  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo" onClick={() => navigate('/dashboard')}>ReadQuest ✨</div>
      <nav className="app-sidebar-nav">
        <button className={`app-sidebar-link ${active==='dashboard'?'active':''}`} onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span>Dashboard</span>
        </button>
        <button className={`app-sidebar-link ${active==='rewards'?'active':''}`} onClick={() => navigate('/rewards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span>Progress & Metrics</span>
        </button>
        <button className={`app-sidebar-link ${active==='shelf'?'active':''}`} onClick={() => navigate('/shelf')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span>Reading Shelf</span>
        </button>
        <button className={`app-sidebar-link ${active==='generate'?'active':''}`} onClick={() => navigate('/generate')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>Generate Story</span>
        </button>
        <button className={`app-sidebar-link ${active==='kids'?'active':''}`} onClick={() => navigate('/add-kid')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>Manage Children</span>
        </button>
        <button className={`app-sidebar-link ${active==='profile'?'active':''}`} onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span>My Profile</span>
        </button>
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-logout" onClick={handleLogout}><span>Log out</span></button>
      </div>
    </aside>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function ReadingShelf() {
  const navigate = useNavigate()
  const [children, setChildren]       = useState<Child[]>([])
  const [childLoading, setChildLoading] = useState(true)
  const [activeChild, setActiveChild] = useState<Child | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setChildLoading(false); return }
      fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`)
        .then(r => r.json())
        .then(data => {
          const list: Child[] = Array.isArray(data) ? data : []
          setChildren(list)
          // Auto-select whichever child is currently active in localStorage, or first child
          const savedId = localStorage.getItem('readquest_student_id')
          const match = list.find(c => c.id === savedId) ?? list[0] ?? null
          setActiveChild(match)
        })
        .catch(() => {})
        .finally(() => setChildLoading(false))
    })
  }, [])

  const handleTabClick = useCallback((child: Child) => {
    setActiveChild(child)
  }, [])

  return (
    <div className="app-shell">
      <AppSidebar active="shelf" />

      <div className="app-content">
        <div className="shelf-page" style={{ minHeight: 'unset' }}>
          <div className="shelf-blob shelf-blob-1" />
          <div className="shelf-blob shelf-blob-2" />

          {/* ── Header ── */}
          <div className="shelf-hero">
            <motion.div className="shelf-hero-content"
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="shelf-title">📚 Reading Shelf</h1>
              <p className="shelf-subtitle">Tap a student to view their completed books</p>
            </motion.div>

            {/* ── Student tab switcher ── */}
            {!childLoading && children.length > 0 && (
              <motion.div className="shelf-student-tabs"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                {children.map((child, i) => (
                  <motion.button
                    key={child.id}
                    className={`shelf-student-tab ${activeChild?.id === child.id ? 'active' : ''}`}
                    onClick={() => handleTabClick(child)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.07 }}>
                    <div className="shelf-tab-avatar"
                      style={{ background: `hsl(${(i * 137) % 360}, 70%, 60%)` }}>
                      {child.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="shelf-tab-info">
                      <span className="shelf-tab-name">{child.name}</span>
                      <span className="shelf-tab-grade">Grade {child.grade_level}</span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {childLoading && (
              <div className="shelf-tabs-loading">Loading students…</div>
            )}

            {!childLoading && children.length === 0 && (
              <div className="shelf-tabs-empty">No students found. <button onClick={() => navigate('/add-kid')}>Add a child</button></div>
            )}
          </div>

          {/* ── Content per student ── */}
          <div className="shelf-content">
            <AnimatePresence mode="wait">
              {activeChild && (
                <motion.div key={activeChild.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}>
                  <StudentShelf child={activeChild} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
