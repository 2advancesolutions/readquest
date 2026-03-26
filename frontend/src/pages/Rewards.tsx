import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { rewardsApi } from '../services/api'
import { supabase } from '../lib/supabase'
import type { StudentRewards, LeaderboardEntry } from '../types'
import { LEVEL_NAMES } from '../types'
import '../styles/rewards.css'
import '../styles/app-shell.css'

// ── Fallback badge definitions (shown greyed-out when DB has none yet) ────────
const FALLBACK_BADGES = [
  { id: '1', slug: 'first_book',   name: 'First Book!',    icon: '📖', description: 'Read your first book',              earned: false },
  { id: '2', slug: 'streak_3',     name: '3-Day Streak',   icon: '🔥', description: 'Read 3 days in a row',              earned: false },
  { id: '3', slug: 'quiz_master',  name: 'Quiz Master',    icon: '🧠', description: 'Get 5 quiz questions right',        earned: false },
  { id: '4', slug: 'speed_reader', name: 'Speed Reader',   icon: '⚡', description: 'Read a book in under 10 min',       earned: false },
  { id: '5', slug: 'streak_7',     name: '7-Day Streak',   icon: '🏆', description: 'Read 7 days in a row',             earned: false },
  { id: '6', slug: 'explorer',     name: 'Genre Explorer', icon: '🗺️', description: 'Read books in 3 different themes', earned: false },
  { id: '7', slug: 'bookworm',     name: 'Bookworm',       icon: '🐛', description: 'Complete 5 books',                 earned: false },
  { id: '8', slug: 'word_wizard',  name: 'Word Wizard',    icon: '🔮', description: 'Reach level 3',                    earned: false },
]

// Empty skeleton — avoids showing fake numbers before the API resolves
const EMPTY_REWARDS: StudentRewards = {
  total_xp: 0,
  level: 1,
  level_name: 'Bookworm 🐛',
  xp_to_next_level: 200,
  xp_progress_pct: 0,
  current_streak: 0,
  badges: [],
  xp_history: [],
  weekly_activity: [],
  stories_read: 0,
}

// ── Sidebar Nav ───────────────────────────────────────────────────────────────
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
        <button className={`app-sidebar-link ${active === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span>Dashboard</span>
        </button>
        <button className={`app-sidebar-link ${active === 'rewards' ? 'active' : ''}`} onClick={() => navigate('/rewards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span>Progress & Metrics</span>
        </button>
        <button className={`app-sidebar-link ${active === 'shelf' ? 'active' : ''}`} onClick={() => navigate('/shelf')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span>Reading Shelf</span>
        </button>
        <button className={`app-sidebar-link ${active === 'generate' ? 'active' : ''}`} onClick={() => navigate('/generate')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>Generate Story</span>
        </button>
        <button className={`app-sidebar-link ${active === 'kids' ? 'active' : ''}`} onClick={() => navigate('/add-kid')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>Manage Children</span>
        </button>
        <button className={`app-sidebar-link ${active === 'profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
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

export default function Rewards() {
  const navigate = useNavigate()
  const [rewards, setRewards]         = useState<StudentRewards>(EMPTY_REWARDS)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading]         = useState(true)
  const [lbLoading, setLbLoading]     = useState(true)
  const [apiError, setApiError]       = useState(false)
  const [tab, setTab] = useState<'overview' | 'badges' | 'leaderboard'>('overview')

  const name             = localStorage.getItem('readquest_student_name') || 'Reader'
  const currentStudentId = localStorage.getItem('readquest_student_id') || ''

  // ── Guard: no student selected ─────────────────────────────────────────────
  const hasStudent = !!currentStudentId

  useEffect(() => {
    if (!hasStudent) {
      setLoading(false)
      setLbLoading(false)
      return
    }

    // Fetch XP + all related data in one call
    rewardsApi.getXP()
      .then(r => {
        const data = r.data as StudentRewards & { weekly_activity?: { date: string; active: boolean }[] }
        setRewards(prev => ({
          ...prev,
          ...data,
          // If DB returned no badges yet, fall back to locked preview badges
          badges: data.badges && data.badges.length > 0 ? data.badges : FALLBACK_BADGES,
          // Ensure xp_history is always 7 items
          xp_history: data.xp_history && data.xp_history.length > 0 ? data.xp_history : prev.xp_history,
          weekly_activity: data.weekly_activity ?? prev.weekly_activity,
        }))
        setApiError(false)
      })
      .catch(() => setApiError(true))
      .finally(() => setLoading(false))

    // Fetch leaderboard separately
    rewardsApi.getLeaderboard()
      .then(r => setLeaderboard(Array.isArray(r.data) ? r.data : []))
      .catch(() => {})
      .finally(() => setLbLoading(false))
  }, [currentStudentId, hasStudent])

  // ── Derived display data ───────────────────────────────────────────────────
  const xpHistory      = rewards.xp_history ?? []
  const weeklyActivity = rewards.weekly_activity ?? []
  const maxXP          = Math.max(...xpHistory.map(d => d.amount), 1)

  // Build 7-day streak dots from `weekly_activity` (real DB data)
  // weeklyActivity[i].active is true if the student read on that day
  const streakDots: { label: string; active: boolean }[] = weeklyActivity.map(w => ({
    label: w.date.charAt(0),
    active: w.active,
  }))

  const top3   = leaderboard.slice(0, 3)
  const restLb = leaderboard.slice(3)

  // ── No student selected — prompt ───────────────────────────────────────────
  if (!hasStudent) {
    return (
      <div className="app-shell">
        <AppSidebar active="rewards" />
        <div className="app-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🧒</div>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.6rem', fontWeight: 800, color: 'var(--rq-text)', marginBottom: 8 }}>
              Select a Student First
            </h2>
            <p style={{ color: 'var(--rq-text-muted)', marginBottom: 28, maxWidth: 320 }}>
              Go to the Dashboard and tap a student's name to load their rewards.
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/dashboard')}
              style={{ background: 'var(--rq-gradient-primary)', color: 'white', border: 'none', borderRadius: '999px', padding: '14px 32px', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 16px rgba(112,42,225,0.35)' }}>
              🏠 Go to Dashboard
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AppSidebar active="rewards" />

      <div className="app-content">

        {/* ── Dark hero banner ── */}
        <div className="rew-hero">
          <div className="rew-hero-content">
            <motion.div className="rew-level-circle"
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}>
              <div className="rew-level-label">Level</div>
              <div className="rew-level-num">{loading ? '…' : rewards.level}</div>
            </motion.div>

            <div className="rew-hero-text">
              <motion.h2 className="rew-level-name"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {loading ? 'Loading…' : (rewards.level_name || LEVEL_NAMES[rewards.level])}
              </motion.h2>

              <motion.div className="rew-stats-row"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <div className="rew-stat">
                  <span className="rew-stat-val">⚡ {rewards.total_xp}</span>
                  <span className="rew-stat-lbl">Total XP</span>
                </div>
                <div className="rew-stat-divider" />
                <div className="rew-stat">
                  <span className="rew-stat-val">🔥 {rewards.current_streak}</span>
                  <span className="rew-stat-lbl">Day Streak</span>
                </div>
                <div className="rew-stat-divider" />
                <div className="rew-stat">
                  <span className="rew-stat-val">📚 {rewards.stories_read ?? 0}</span>
                  <span className="rew-stat-lbl">Books Read</span>
                </div>
                <div className="rew-stat-divider" />
                <div className="rew-stat">
                  <span className="rew-stat-val">{name}</span>
                  <span className="rew-stat-lbl">Reader</span>
                </div>
              </motion.div>

              <motion.div className="rew-xp-bar-wrap"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <div className="rew-xp-bar-track">
                  <motion.div className="rew-xp-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${rewards.xp_progress_pct}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.45 }} />
                </div>
                <div className="rew-xp-bar-labels">
                  <span>{rewards.total_xp} XP</span>
                  <span>{rewards.xp_to_next_level} XP to level up</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* ── API error banner ── */}
        {apiError && (
          <div style={{ background: '#FEF3C7', borderBottom: '1px solid #FCD34D', padding: '10px 24px', textAlign: 'center', fontSize: '0.88rem', fontWeight: 600, color: '#92400E' }}>
            ⚠️ Couldn't load rewards data. Check your connection or ensure the backend is running.
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="rew-tabs-wrap">
          <div className="rew-tabs">
            {(['overview', 'badges', 'leaderboard'] as const).map(t => (
              <button key={t} className={`rew-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'overview' ? '📊 Overview' : t === 'badges' ? '🏅 Achievements' : '🏆 Leaderboard'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="rew-content">
          <AnimatePresence mode="wait">

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <motion.div key="overview" className="rew-overview"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>

                {/* Weekly XP bar chart — real data from xp_history */}
                <div className="rew-card">
                  <h3 className="rew-card-title">📈 Weekly XP Activity</h3>
                  {loading ? (
                    <div className="rew-bar-chart">
                      {[0,1,2,3,4,5,6].map(i => (
                        <div key={i} className="rew-bar-col">
                          <span className="rew-bar-val" />
                          <div className="rew-bar-track-v" style={{ opacity: 0.4 }} />
                          <span className="rew-bar-lbl">—</span>
                        </div>
                      ))}
                    </div>
                  ) : xpHistory.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--rq-text-muted)', fontSize: '0.9rem' }}>
                      No XP earned yet this week. Start reading! 📖
                    </div>
                  ) : (
                    <div className="rew-bar-chart">
                      {xpHistory.map((d, i) => (
                        <div key={i} className="rew-bar-col">
                          <span className="rew-bar-val">{d.amount > 0 ? d.amount : ''}</span>
                          <div className="rew-bar-track-v">
                            <motion.div
                              className="rew-bar-fill-v"
                              initial={{ height: 0 }}
                              animate={{ height: `${(d.amount / maxXP) * 100}%` }}
                              transition={{ delay: 0.08 * i + 0.1, duration: 0.55, ease: 'easeOut' }}
                              style={{ background: d.amount === 0 ? 'var(--rq-surface-highest)' : undefined }}
                            />
                          </div>
                          <span className="rew-bar-lbl">{d.date.charAt(0)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reading streak — driven by real weekly_activity from DB */}
                <div className="rew-card">
                  <h3 className="rew-card-title">🔥 Reading Consistency</h3>
                  {loading ? (
                    <div className="streak-week">
                      {[0,1,2,3,4,5,6].map(i => (
                        <div key={i} className="streak-day">
                          <div className="streak-circle" style={{ opacity: 0.4 }} />
                          <span className="streak-label">—</span>
                        </div>
                      ))}
                    </div>
                  ) : streakDots.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--rq-text-muted)', fontSize: '0.9rem' }}>
                      No reading activity recorded yet. 📅
                    </div>
                  ) : (
                    <div className="streak-week">
                      {streakDots.map((dot, i) => (
                        <div key={i} className={`streak-day ${dot.active ? 'active' : ''}`}>
                          <div className="streak-circle">
                            {dot.active && (
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="streak-label">{dot.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* BADGES — real data from DB, fallback to preview if empty */}
            {tab === 'badges' && (
              <motion.div key="badges"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>
                {rewards.badges.length === 0 && !loading ? (
                  <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--rq-text-muted)' }}>
                    🏅 No badges yet — read more stories to unlock them!
                  </div>
                ) : (
                  <div className="rew-badges-grid">
                    {rewards.badges.map((b, idx) => (
                      <motion.div key={b.id}
                        className={`rew-badge-card ${b.earned ? 'earned' : 'locked'}`}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}>
                        <div className="rew-badge-icon">
                          {b.earned ? (
                            <span style={{ fontSize: '1.6rem' }}>{b.icon}</span>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          )}
                        </div>
                        <div className="rew-badge-info">
                          <div className="rew-badge-name">{b.icon} {b.name}</div>
                          <div className="rew-badge-desc">{b.description}</div>
                          {b.earned && <div className="rew-badge-status">✅ Earned</div>}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* LEADERBOARD */}
            {tab === 'leaderboard' && (
              <motion.div key="leaderboard" className="rew-leaderboard"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28 }}>

                {lbLoading ? (
                  <div className="lb-loading">⏳ Loading leaderboard...</div>
                ) : leaderboard.length === 0 ? (
                  <div className="lb-empty">🏆 No students yet — start reading to appear here!</div>
                ) : (
                  <>
                    {/* Podium (top 3) */}
                    {top3.length > 0 && (
                      <div className="lb-podium">
                        {top3.map((entry, i) => {
                          const rank = i + 1
                          const medalEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
                          const isMe = entry.student_id === currentStudentId
                          return (
                            <motion.div key={entry.student_id}
                              className={`lb-podium-slot rank-${rank}`}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.1 * i, type: 'spring', stiffness: 220 }}>
                              <div className="lb-podium-avatar">
                                {rank === 1 && <span className="lb-podium-crown">👑</span>}
                                {entry.name[0].toUpperCase()}
                              </div>
                              <div className="lb-podium-name">{entry.name}{isMe ? ' 👈' : ''}</div>
                              <div className="lb-podium-xp">⚡ {entry.total_xp} XP</div>
                              <div className="lb-podium-bar">{medalEmoji}</div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}

                    {/* Full table (always show all, including top 3 again for clarity) */}
                    <div className="lb-table">
                      <div className="lb-header">
                        <div className="lb-col-rank">Rank</div>
                        <div className="lb-col-user">Reader</div>
                        <div className="lb-col-score">XP</div>
                      </div>
                      <div className="lb-body">
                        {leaderboard.map((entry, i) => {
                          const isMe = entry.student_id === currentStudentId
                          const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${entry.rank}`
                          return (
                            <motion.div key={entry.student_id + i}
                              className={`lb-row ${isMe ? 'me' : ''}`}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.04 * i }}>
                              <span className={`rank-num rank-${Math.min(entry.rank, 3)}`}>{rankIcon}</span>
                              <div className="lb-col-user">
                                <div className="lb-avatar">{entry.name[0].toUpperCase()}</div>
                                <div className="lb-info">
                                  <div className="lb-name">{entry.name}{isMe ? ' 👈 You' : ''}</div>
                                  <div className="lb-level">{entry.level_name}</div>
                                </div>
                              </div>
                              <div className="lb-col-score">
                                <span className="score-val">{entry.total_xp} XP</span>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
