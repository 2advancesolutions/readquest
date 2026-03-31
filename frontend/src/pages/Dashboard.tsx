import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { storiesApi, rewardsApi } from '../services/api'
import { supabase } from '../lib/supabase'
import { preloadWelcomeVoice } from '../components/WelcomeVoice'
import { preloadSpellingWelcome } from '../lib/spellingWelcome'
import { preloadExamTutorial } from '../lib/examTutorial'
import { emitXpUpdate } from '../components/XpBadge'
import StudentDropdown from '../components/StudentDropdown'
import type { Story, StudentRewards } from '../types'
import '../styles/dashboard.css'

const GRADE_LABELS = ['Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade']
const GRADE_EMOJIS = ['🌱','⭐','🚀','📚','🔬','🌍','🎯','💡','🏆']
const CHILD_COLORS = ['#702AE1','#F59E0B','#10B981','#3B82F6','#EC4899','#F97316']

const LEVEL_NAMES: Record<number, string> = {
  1: 'Bookworm', 2: 'Story Explorer', 3: 'Word Wizard', 4: 'Reading Champion', 5: 'Legend',
}

const MOCK_REWARDS: StudentRewards = {
  total_xp: 0, level: 1, level_name: 'Bookworm', xp_to_next_level: 200, xp_progress_pct: 0,
  current_streak: 0, badges: [],
  xp_history: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => ({ date: d, amount: 0 })),
  weekly_activity: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => ({ date: d, active: false })),
  stories_read: 0,
}

const THEME_EMOJIS: Record<string, string> = {
  animals:'🦁', space:'🚀', adventure:'🗺️', fantasy:'🧙', sports:'⚽', science:'🔬', ocean:'🐠', dinosaurs:'🦕'
}

type Child = { id: string; name: string; grade_level: number; school?: string }

async function fetchRewardsForStudent(studentId: string): Promise<StudentRewards> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rewards/xp`, {
    headers: { 'X-Student-ID': studentId },
  })
  if (!res.ok) throw new Error('Failed to fetch rewards')
  return res.json()
}

async function fetchStoriesForStudent(studentId: string): Promise<Partial<Story>[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stories`, {
    headers: { 'X-Student-ID': studentId },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data?.stories ?? []
}

/** Merge localStorage reading_progress into each story object. */
function enrichWithLocalProgress(list: any[], studentId: string) {
  return list.map((s: any) => {
    const stored = JSON.parse(localStorage.getItem(`rq_progress_${studentId}_${s.id}`) || 'null')
    if (!stored) return s
    const total = stored.totalPages || s.page_count || 0
    const last  = stored.lastPage  || 0
    return {
      ...s,
      last_page: last,
      page_count: total,
      progress_pct: total > 0 ? Math.round((last / total) * 100) : 0,
      completed_at: last >= total && total > 0 ? (s.completed_at || 'completed') : s.completed_at,
    }
  })
}

// ── Circular goal ring ───────────────────────────────────────────────────────
function GoalRing({ minutes, goal = 20 }: { minutes: number; goal?: number }) {
  const radius = 30
  const circ = 2 * Math.PI * radius
  const pct = Math.min(minutes / goal, 1)
  const offset = circ * (1 - pct)
  return (
    <div className="dash-goal-ring">
      <svg className="dash-goal-svg" viewBox="0 0 80 80">
        <defs>
          <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9B5EFF" />
            <stop offset="100%" stopColor="#702AE1" />
          </linearGradient>
        </defs>
        <circle className="dash-goal-track" cx="40" cy="40" r={radius} />
        <motion.circle
          className="dash-goal-fill"
          cx="40" cy="40" r={radius}
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="dash-goal-label">
        <span className="dash-goal-num">{goal}</span>
        <span className="dash-goal-unit">min</span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [rewards, setRewards] = useState<StudentRewards>(MOCK_REWARDS)
  const [stories, setStories] = useState<Partial<Story>[]>([])
  const [greeting, setGreeting] = useState('')
  const [parentName, setParentName] = useState('Reader')
  const [parentId, setParentId] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [childrenLoading, setChildrenLoading] = useState(true)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [contentLoading, setContentLoading] = useState(false)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setChildrenLoading(false); return }
      const meta = session.user.user_metadata
      const name = [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || session.user.email || 'Reader'
      setParentName(name)
      setParentId(session.user.id)

      fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(async (data) => {
          const list: Child[] = Array.isArray(data) ? data : []
          setChildren(list)

          // Restore the previously selected child
          const savedId = localStorage.getItem('readquest_student_id')
          const match = list.find(c => c.id === savedId) ?? list[0] ?? null

          if (match) {
            // Persist selection
            localStorage.setItem('readquest_student_id', match.id)
            localStorage.setItem('readquest_student_name', match.name)
            localStorage.setItem('readquest_student_grade', String(match.grade_level ?? 1))
            // Preload Spelling Arena + Exam Center welcome audio in the background
            preloadSpellingWelcome(match.id, match.name)
            preloadExamTutorial(match.id, match.name)
            setSelectedChild(match)

            // Fetch data SCOPED to this child — never show another student's stories
            setContentLoading(true)
            try {
              const [r, s] = await Promise.all([
                fetchRewardsForStudent(match.id).catch(() => null),
                fetchStoriesForStudent(match.id).catch(() => []),
              ])
              if (r) {
                setRewards(prev => ({ ...prev, ...r }))
                emitXpUpdate(r.total_xp ?? 0)
              }
              setStories(enrichWithLocalProgress(s as any[], match.id))
            } catch { /* non-fatal */ } finally {
              setContentLoading(false)
            }
          } else {
            // No child profiles yet — show empty state
            setStories([])
            setRewards(MOCK_REWARDS)
          }
        })
        .catch(() => { setChildren([]); setStories([]) })
        .finally(() => setChildrenLoading(false))
    })
  }, [])

  const selectChild = useCallback(async (child: Child | null) => {
    setSelectedChild(child)
    setContentLoading(true)
    if (child) {
      localStorage.setItem('readquest_student_id', child.id)
      localStorage.setItem('readquest_student_name', child.name)
      localStorage.setItem('readquest_student_grade', String(child.grade_level ?? 1))
      // Preload Spelling Arena + Exam Center welcome audio in the background
      preloadSpellingWelcome(child.id, child.name)
      preloadExamTutorial(child.id, child.name)
    } else {
      localStorage.removeItem('readquest_student_id')
      localStorage.removeItem('readquest_student_name')
      localStorage.removeItem('readquest_student_grade')
    }
    try {
      if (child) {
        const [r, s] = await Promise.all([
          fetchRewardsForStudent(child.id),
          fetchStoriesForStudent(child.id),
        ])
        setRewards(prev => ({ ...prev, ...r }))
        emitXpUpdate(r.total_xp ?? 0)
        setStories(enrichWithLocalProgress(s, parentId ?? ''))
      } else {
        const [rr, sr] = await Promise.all([
          rewardsApi.getXP().catch(() => null),
          storiesApi.list().catch(() => null),
        ])
        if (rr) {
          setRewards(prev => ({ ...prev, ...rr.data }))
          emitXpUpdate(rr.data?.total_xp ?? 0)
        }
        if (sr) {
          const list = Array.isArray(sr.data) ? sr.data : sr.data?.stories ?? []
          setStories(enrichWithLocalProgress(list, parentId ?? ''))
        }
      }
    } catch { /* non-fatal */ }
    setContentLoading(false)
  }, [parentId])

  const handleLogout = useCallback(() => {
    localStorage.clear()
    import('../lib/supabase').then(m => m.supabase.auth.signOut())
    navigate('/')
  }, [navigate])

  const handleDelete = useCallback(async (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation()
    if (!window.confirm('Delete this story? This cannot be undone.')) return
    try {
      await storiesApi.delete(storyId)
      setStories(prev => prev.filter(s => s.id !== storyId))
    } catch { alert('Failed to delete story.') }
  }, [])

  const resolveCoverUrl = (url?: string) => {
    if (!url) return null
    if (url.startsWith('/static')) return `${import.meta.env.VITE_API_URL}${url}`
    if (url.startsWith('http')) return url
    return null
  }

  const xpHistory = rewards.xp_history ?? []
  const maxXP = Math.max(...xpHistory.map(d => d.amount), 1)
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

  // Find the most-recently-started in-progress story for "continue reading"
  const inProgressStory = stories.find(s => !s.completed_at && (s.progress_pct ?? 0) > 0)
    ?? stories.find(s => !s.completed_at)

  const childName = selectedChild?.name ?? parentName.split(' ')[0] ?? 'Explorer'

  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = () => setMenuOpen(false)
  const navAndClose = (path: string) => { navigate(path); closeMenu() }

  return (
    <div className="dash-root">

      {/* ── Starfield ── */}
      <div className="dash-stars" aria-hidden>
        {[...Array(24)].map((_, i) => (
          <div key={i} className="dash-star" style={{
            left: `${(i * 17 + 7) % 97}%`,
            top: `${(i * 23 + 3) % 91}%`,
            animationDelay: `${(i * 0.37) % 3}s`,
            width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
          }} />
        ))}
      </div>

      {/* ════ LEFT SIDEBAR ════ */}
      <aside className="dash-sidebar">
        <div>
          <div className="dash-logo">ReadQuest</div>
          <div className="dash-logo-sub">The Weightless Archive</div>
        </div>
        <nav className="dash-nav">
          <button className="dash-nav-link active" id="nav-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Home</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/shelf')} id="nav-library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span>Library</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/rewards')} id="nav-rewards">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            <span>Rewards</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/spelling')} id="nav-spelling">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
            <span>Spelling</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/spelling-scores')} id="nav-spell-scores">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span>Spell Scores</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/games')} id="nav-games">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
            <span>Games</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/leaderboard')} id="nav-leaderboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 17v4M5 3H3v5a7 7 0 0014 0V3h-2M5 3h14M5 3a2 2 0 00-2 2v3M19 3a2 2 0 012 2v3" /></svg>
            <span>Leaderboard</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/exams')} id="nav-exams">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" /></svg>
            <span>Exams</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/scores')} id="nav-scores">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <span>Scores</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/recordings')} id="nav-recordings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <span>Recordings</span>
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/add-kid')} id="nav-profile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span>Profile</span>
          </button>

          {/* ── Featured CTAs ── */}
          <div className="dash-nav-featured-group">
            <motion.button
              className="dash-nav-featured dash-nav-featured-story"
              onClick={() => { preloadWelcomeVoice(); navigate('/generate') }}
              id="nav-generate"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="dash-nav-featured-icon">✨</span>
              <span className="dash-nav-featured-text">
                <span className="dash-nav-featured-label">Generate Story</span>
                <span className="dash-nav-featured-sub">AI-powered tales</span>
              </span>
            </motion.button>
            <motion.button
              className="dash-nav-featured dash-nav-featured-studio"
              onClick={() => navigate('/movie-studio')}
              id="nav-movie-studio"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="dash-nav-featured-icon">🎬</span>
              <span className="dash-nav-featured-text">
                <span className="dash-nav-featured-label">Movie Studio</span>
                <span className="dash-nav-featured-sub">Create your film</span>
              </span>
            </motion.button>
          </div>
          <div className="dash-nav-divider" />
        </nav>

        <div className="dash-sidebar-bottom">
          <button className="dash-logout-btn" onClick={handleLogout} id="nav-logout">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* ════ MOBILE DRAWER ════ */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="dash-drawer-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={closeMenu}
            />
            {/* Drawer */}
            <motion.aside
              className="dash-drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              <div className="dash-drawer-header">
                <div>
                  <div className="dash-logo">ReadQuest</div>
                  <div className="dash-logo-sub">The Weightless Archive</div>
                </div>
                <button className="dash-drawer-close" onClick={closeMenu} aria-label="Close menu">✕</button>
              </div>
              <nav className="dash-nav">
                <button className="dash-nav-link active" onClick={closeMenu} id="drawer-home">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  <span>Home</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/shelf')} id="drawer-library">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  <span>Library</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/rewards')} id="drawer-rewards">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                  <span>Rewards</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/spelling')} id="drawer-spelling">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  <span>Spelling</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/spelling-scores')} id="drawer-spell-scores">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>Spell Scores</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/games')} id="drawer-games">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                  <span>Games</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/leaderboard')} id="drawer-leaderboard">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 21h8M12 17v4M5 3H3v5a7 7 0 0014 0V3h-2M5 3h14M5 3a2 2 0 00-2 2v3M19 3a2 2 0 012 2v3" /></svg>
                  <span>Leaderboard</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/exams')} id="drawer-exams">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6m-6 4h6" /></svg>
                  <span>Exams</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/scores')} id="drawer-scores">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  <span>Scores</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/recordings')} id="drawer-recordings">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  <span>Recordings</span>
                </button>
                <button className="dash-nav-link" onClick={() => navAndClose('/add-kid')} id="drawer-profile">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span>Profile</span>
                </button>
                <div className="dash-nav-featured-group">
                  <motion.button
                    className="dash-nav-featured dash-nav-featured-story"
                    onClick={() => { preloadWelcomeVoice(); navAndClose('/generate') }}
                    id="drawer-generate"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  >
                    <span className="dash-nav-featured-icon">✨</span>
                    <span className="dash-nav-featured-text">
                      <span className="dash-nav-featured-label">Generate Story</span>
                      <span className="dash-nav-featured-sub">AI-powered tales</span>
                    </span>
                  </motion.button>
                  <motion.button
                    className="dash-nav-featured dash-nav-featured-studio"
                    onClick={() => navAndClose('/movie-studio')}
                    id="drawer-movie-studio"
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  >
                    <span className="dash-nav-featured-icon">🎬</span>
                    <span className="dash-nav-featured-text">
                      <span className="dash-nav-featured-label">Movie Studio</span>
                      <span className="dash-nav-featured-sub">Create your film</span>
                    </span>
                  </motion.button>
                </div>
                <div className="dash-nav-divider" />
              </nav>
              <div className="dash-sidebar-bottom">
                <button className="dash-logout-btn" onClick={() => { handleLogout(); closeMenu() }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ════ MAIN AREA ════ */}
      <div className="dash-main">


        {/* ── Top Header ── */}
        <header className="dash-top-header">

          {/* Greeting — desktop only (mobile uses global MobileNav FAB) */}
          <div className="dash-greeting-wrap">
            <h1 className="dash-greeting">Welcome back, {childName}!</h1>
            <p className="dash-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Student selector dropdown */}
          {!childrenLoading && children.length > 0 && (
            <StudentDropdown
              children={children}
              selected={selectedChild}
              onChange={selectChild}
              allowAll={children.length > 1}
            />
          )}

          <div className="dash-header-actions">
            <motion.button
              className="dash-header-studio-btn"
              whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/movie-studio')}
              id="btn-movie-studio"
            >
              🎬 Movie Studio
            </motion.button>
            <motion.button
              className="dash-create-btn"
              whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => { preloadWelcomeVoice(); navigate('/generate') }}
              id="btn-generate"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Generate Story
            </motion.button>
            <div className="dash-avatar" title={parentName}>
              {parentName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* ════ FEED ROW ════ */}
        <div className="dash-feed">

          {/* ── CENTER CONTENT ── */}
          <div className="dash-center">

            {/* Continue Reading Hero */}
            {inProgressStory && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={inProgressStory.id}
                  className="dash-continue-card"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <div className="dash-continue-cover">
                    {resolveCoverUrl(inProgressStory.cover_media_url as string | undefined) ? (
                      <img src={resolveCoverUrl(inProgressStory.cover_media_url as string | undefined)!} alt={inProgressStory.title} />
                    ) : (
                      <div className="dash-continue-cover-placeholder">
                        {THEME_EMOJIS[inProgressStory.theme || 'adventure'] || '📖'}
                      </div>
                    )}
                  </div>
                  <div className="dash-continue-info">
                    <div className="dash-continue-badge">Continue Reading</div>
                    <div className="dash-continue-title">{inProgressStory.title}</div>
                    <div className="dash-continue-meta">
                      Grade {inProgressStory.grade_level} · {inProgressStory.theme ? inProgressStory.theme.charAt(0).toUpperCase() + inProgressStory.theme.slice(1) : 'Story'}
                    </div>
                    <div className="dash-continue-progress-label">
                      <span>Progress</span>
                      <span>{inProgressStory.progress_pct ?? 0}% Complete</span>
                    </div>
                    <div className="dash-continue-progress-track">
                      <motion.div
                        className="dash-continue-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${inProgressStory.progress_pct ?? 0}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                    <button
                      className="dash-keep-reading-btn"
                      onClick={() => navigate(`/read/${inProgressStory.id}`)}
                      id="btn-keep-reading"
                    >
                      Keep Reading 📖
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Available Stories */}
            <div className="dash-section">
              <div className="dash-section-header">
                <div>
                  <div className="dash-section-title">Available Stories</div>
                  <div className="dash-section-sub">
                    {selectedChild
                      ? `Handpicked for ${selectedChild.name}'s level`
                      : 'Your reading content'}
                  </div>
                </div>
                <button className="dash-view-all-btn" onClick={() => navigate('/shelf')} id="btn-view-library">
                  View Library →
                </button>
              </div>

              <AnimatePresence mode="wait">
                {contentLoading ? (
                  <motion.div key="loading" style={{ color: 'var(--rq-text-muted)', fontSize: '0.9rem', padding: '20px 0', display: 'flex', alignItems: 'center', gap: 10 }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span style={{ display: 'inline-block', width: 18, height: 18, border: '2px solid var(--rq-purple-light)', borderTopColor: 'var(--rq-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Loading stories…
                  </motion.div>
                ) : stories.length === 0 ? (
                  <motion.div key="empty" className="dash-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="dash-empty-icon">📖</div>
                    <p>{selectedChild ? `No stories for ${selectedChild.name} yet.` : 'No stories yet — generate the first one!'}</p>
                    <button className="dash-empty-btn" onClick={() => { preloadWelcomeVoice(); navigate('/generate') }}>Generate a Story ✨</button>
                  </motion.div>
                ) : (
                  <motion.div key="stories" className="story-grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    {stories.map((s, i) => {
                      const coverUrl = resolveCoverUrl(s.cover_media_url as string | undefined)
                      const pct: number = s.progress_pct ?? 0
                      const isComplete = !!s.completed_at
                      const resumePage: number = s.last_page ?? 0
                      return (
                        <motion.div
                          key={s.id}
                          className={`story-card ${isComplete ? 'story-card-complete' : ''}`}
                          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.28, delay: 0.05 * i }}
                          onClick={() => navigate(`/read/${s.id}`)}
                          id={`story-card-${s.id}`}
                        >
                          <button className="story-delete-btn" title="Delete" onClick={(e) => handleDelete(e, s.id!)}>✕</button>
                          {isComplete && <div className="story-complete-badge">⭐</div>}

                          <div className="story-cover">
                            {coverUrl ? (
                              <img src={coverUrl} alt={s.title} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : (
                              <div className="story-cover-placeholder">
                                <span>{THEME_EMOJIS[s.theme || 'animals'] || '📖'}</span>
                              </div>
                            )}
                          </div>

                          <div className="story-info">
                            <div className="story-grade-chip">Grade {s.grade_level}</div>
                            <p className="story-title">{s.title}</p>
                            <p className="story-meta">
                              <span className="story-meta-dot">●</span>
                              {pct > 0 ? `${pct}% read` : '8 min read'}
                            </p>
                            {pct > 0 && (
                              <div className="story-progress-wrap">
                                <div className="story-progress-bar">
                                  <div className="story-progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: isComplete ? '#F59E0B' : undefined }} />
                                </div>
                                <span className="story-progress-label">
                                  {isComplete ? `✅ Completed` : `Resume p.${resumePage + 1}`}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ════ RIGHT PANEL ════ */}
          <aside className="dash-right-panel">

            {/* Streak Card */}
            <motion.div
              className="dash-streak-card"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="dash-streak-label">🔥 Reading Streak</div>
              <div>
                <span className="dash-streak-num">{rewards.current_streak}</span>
                <span className="dash-streak-unit">days</span>
              </div>
              <div className="dash-streak-sub">
                {rewards.current_streak === 0
                  ? 'Read today to start your streak!'
                  : rewards.current_streak >= 7
                  ? `Amazing! A whole week! 🎉`
                  : `You're on fire, ${childName.split(' ')[0]}!`}
              </div>
            </motion.div>

            {/* Weekly Reading Bar Chart */}
            <motion.div
              className="dash-mini-card"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
            >
              <div className="dash-mini-card-header">
                <span className="dash-mini-card-title">Weekly Reading</span>
                <span style={{ fontSize: '1.1rem' }}>···</span>
              </div>
              <div className="dash-bar-chart">
                {xpHistory.map((d, i) => {
                  const pct = maxXP > 0 ? (d.amount / maxXP) * 100 : 0
                  const isToday = i === todayIdx
                  return (
                    <div key={i} className="dash-bar-col">
                      <motion.div
                        className={`dash-bar-fill ${d.amount > 0 ? 'has-value' : ''} ${isToday ? 'today' : ''}`}
                        style={{ height: `${Math.max(pct, 6)}%` }}
                        initial={{ height: '6%' }}
                        animate={{ height: `${Math.max(pct, 6)}%` }}
                        transition={{ delay: 0.08 * i + 0.2, duration: 0.5, ease: 'easeOut' }}
                      />
                      <span className="dash-bar-day">{d.date.charAt(0)}</span>
                    </div>
                  )
                })}
              </div>
              <div className="dash-mini-stats">
                <div className="dash-mini-stat">
                  <div className="dash-mini-stat-val">
                    {xpHistory.reduce((acc, d) => acc + d.amount, 0) > 0
                      ? `${Math.round(xpHistory.reduce((acc, d) => acc + d.amount, 0) / 10)}m`
                      : '0m'}
                  </div>
                  <div className="dash-mini-stat-lbl">Total Time</div>
                </div>
                <div className="dash-mini-stat">
                  <div className="dash-mini-stat-val">{rewards.stories_read ?? stories.filter(s => s.completed_at).length}</div>
                  <div className="dash-mini-stat-lbl">Books Read</div>
                </div>
              </div>
            </motion.div>

            {/* Today's Goal Ring */}
            <motion.div
              className="dash-goal-card"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="dash-mini-card-header">
                <span className="dash-mini-card-title">Today's Goal</span>
              </div>
              <div className="dash-goal-ring-wrap">
                <GoalRing minutes={15} goal={20} />
              </div>
              <div className="dash-goal-sub">Almost there!<br />Only 5 more minutes to reach your daily quest.</div>
              <button className="dash-goal-btn" id="btn-adjust-goal">Adjust Goal</button>
            </motion.div>

          </aside>
        </div>
      </div>
    </div>
  )
}
