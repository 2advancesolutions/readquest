import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { storiesApi, rewardsApi } from '../services/api'
import type { Story, StudentRewards } from '../types'
import '../styles/dashboard.css'

const GRADE_LABELS = ['Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade']
const THEMES = ['🦁 Animals','🚀 Space','🗺️ Adventure','🧙 Fantasy','⚽ Sports','🔬 Science','🐠 Ocean','🦕 Dinosaurs']

const LEVEL_NAMES: Record<number, string> = {
  1: 'Bookworm', 2: 'Story Explorer', 3: 'Word Wizard', 4: 'Reading Champion', 5: 'Legend',
}

// Mock data for demo mode (no backend)
const MOCK_REWARDS: StudentRewards = {
  total_xp: 0, level: 1, level_name: 'Bookworm', xp_to_next_level: 200, xp_progress_pct: 0,
  current_streak: 0,
  badges: [],
  xp_history: [
    { date: 'Mon', amount: 0 }, { date: 'Tue', amount: 0 }, { date: 'Wed', amount: 0 },
    { date: 'Thu', amount: 0 }, { date: 'Fri', amount: 0 }, { date: 'Sat', amount: 0 }, { date: 'Sun', amount: 0 },
  ],
  weekly_activity: [
    { date: 'Mon', active: false }, { date: 'Tue', active: false }, { date: 'Wed', active: false },
    { date: 'Thu', active: false }, { date: 'Fri', active: false }, { date: 'Sat', active: false }, { date: 'Sun', active: false },
  ],
  stories_read: 0,
}

const MOCK_STORIES: Partial<Story>[] = [
  { id: 'mock-1', title: 'Leo the Brave Lion', theme: 'animals', cover_media_url: '', grade_level: 2 },
  { id: 'mock-2', title: 'Zara\'s Space Adventure', theme: 'space', cover_media_url: '', grade_level: 3 },
  { id: 'mock-3', title: 'The Dragon\'s Secret', theme: 'fantasy', cover_media_url: '', grade_level: 4 },
]

const THEME_EMOJIS: Record<string, string> = {
  animals:'🦁', space:'🚀', adventure:'🗺️', fantasy:'🧙', sports:'⚽', science:'🔬', ocean:'🐠', dinosaurs:'🦕'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [rewards, setRewards] = useState<StudentRewards>(MOCK_REWARDS)
  const [stories, setStories] = useState<Partial<Story>[]>(MOCK_STORIES)
  const [greeting, setGreeting] = useState('')
  const name = localStorage.getItem('readquest_student_name') || 'Reader'
  const grade = Number(localStorage.getItem('readquest_grade') || 0)

  useEffect(() => {
    const h = new Date().getHours()
    setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')
    // Merge API data into mock defaults so xp_history/badges always exist
    rewardsApi.getXP().then(r => setRewards(prev => ({ ...prev, ...r.data }))).catch(() => {})
    storiesApi.list().then(r => setStories(Array.isArray(r.data) ? r.data : r.data?.stories ?? [])).catch(() => {})
  }, [])

  const handleLogout = useCallback(() => {
    localStorage.clear()
    navigate('/')
  }, [navigate])

  const handleDelete = useCallback(async (e: React.MouseEvent, storyId: string) => {
    e.stopPropagation()  // don't navigate to the story
    if (!window.confirm('Delete this story? This cannot be undone.')) return
    try {
      await storiesApi.delete(storyId)
      setStories(prev => prev.filter(s => s.id !== storyId))
    } catch {
      alert('Failed to delete story.')
    }
  }, [])

  const resolveCoverUrl = (url?: string) => {
    if (!url) return null
    if (url.startsWith('/static')) return `http://localhost:8000${url}`
    if (url.startsWith('http')) return url
    return null
  }

  const xpHistory = rewards.xp_history ?? []
  const maxXP = Math.max(...xpHistory.map(d => d.amount), 1)

  return (
    <div className="dash-root">
      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="dash-logo">ReadQuest</div>

        <nav className="dash-nav">
          <button className="dash-nav-link active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </button>
          <button className="dash-nav-link" onClick={() => navigate('/rewards')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Progress & Metrics
          </button>
        </nav>

        <div className="dash-sidebar-bottom">
          <button className="dash-logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="dash-main">
        {/* Header */}
        <header className="dash-top-header">
          <div>
            <h1 className="dash-greeting">{greeting}, {name}</h1>
            <p className="dash-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {GRADE_LABELS[grade]}</p>
          </div>
          <motion.button className="dash-create-btn" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => navigate('/generate')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Generate Content
          </motion.button>
        </header>

        {/* Metrics Row */}
        <div className="dash-metrics-row">
          <motion.div className="dash-metric-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="metric-header">
              <span className="metric-title">Level Progression</span>
              <span className="metric-icon" style={{ color: 'var(--rq-purple)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </span>
            </div>
            <div className="metric-value">Level {rewards.level}</div>
            <div className="metric-sub">{rewards.level_name || LEVEL_NAMES[rewards.level]}</div>
            <div className="xp-bar-container">
              <div className="xp-bar-track">
                <motion.div
                  className="xp-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${rewards.xp_progress_pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                />
              </div>
              <div className="xp-bar-label">
                <span>{rewards.total_xp} XP Total</span>
                <span>{rewards.xp_to_next_level} XP left</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="dash-metric-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
            <div className="metric-header">
              <span className="metric-title">Reading Streak</span>
              <span className="metric-icon" style={{ color: 'var(--rq-coral)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>
              </span>
            </div>
            <div className="metric-value">{rewards.current_streak} <span className="metric-unit">days</span></div>
            <p className="metric-desc">
              {rewards.current_streak === 0
                ? 'Read today to start your streak! 🚀'
                : rewards.current_streak >= 7
                ? 'Incredible! A whole week of reading! 🔥🏆'
                : rewards.current_streak >= 3
                ? `${rewards.current_streak} days strong — keep it up! 🔥`
                : 'Great start! Keep reading every day! ⭐'}
            </p>
          </motion.div>

          <motion.div className="dash-metric-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
            <div className="metric-header">
              <span className="metric-title">Weekly Activity</span>
            </div>
            <div className="bar-chart">
              {(rewards.weekly_activity ?? xpHistory.map(d => ({ date: d.date, active: d.amount > 0 }))).map((d: { date: string; active: boolean }, i: number) => (
                <div key={i} className="bar-col">
                  <motion.div
                    className={`activity-dot ${d.active ? 'active' : ''}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 * i + 0.3, duration: 0.4, ease: 'easeOut' }}
                    title={d.active ? `Read on ${d.date}!` : `No reading on ${d.date}`}
                  />
                  <span className="bar-label">{d.date.charAt(0)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Stories Section */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">Recent Content</h2>
          </div>

          <div className="story-grid">
            {stories.map((s, i) => {
              const coverUrl = resolveCoverUrl(s.cover_media_url as string | undefined)
              return (
                <motion.div
                  key={s.id}
                  className="story-card"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 * i + 0.3 }}
                  onClick={() => navigate(`/read/${s.id}`)}
                >
                  {/* Delete button on hover */}
                  <button
                    className="story-delete-btn"
                    title="Delete story"
                    onClick={(e) => handleDelete(e, s.id!)}
                  >✕</button>

                  <div className="story-cover">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={s.title}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    ) : (
                      <div className="story-cover-placeholder">
                        <span style={{fontSize:'2.5rem'}}>
                          {THEME_EMOJIS[s.theme || 'animals'] || '📖'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="story-info">
                    <p className="story-title">{s.title}</p>
                    <p className="story-meta">Grade {s.grade_level} • <span style={{textTransform:'capitalize'}}>{s.theme}</span></p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

      </main>
    </div>
  )
}
