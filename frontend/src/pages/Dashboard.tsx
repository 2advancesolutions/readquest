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
  total_xp: 340, level: 2, level_name: 'Story Explorer', xp_to_next_level: 60, xp_progress_pct: 70,
  current_streak: 5,
  badges: [
    { id: '1', slug: 'first_book', name: 'First Book!', icon: '📖', description: 'Read your first book', earned: true, earned_at: '2024-01-01' },
    { id: '2', slug: 'streak_3', name: '3-Day Streak', icon: '🔥', description: 'Read 3 days in a row', earned: true, earned_at: '2024-01-03' },
    { id: '3', slug: 'quiz_master', name: 'Quiz Master', icon: '🧠', description: 'Get 5 quiz questions right', earned: false },
    { id: '4', slug: 'speed_reader', name: 'Speed Reader', icon: '⚡', description: 'Read a book in under 10 min', earned: false },
  ],
  xp_history: [
    { date: 'Mon', amount: 35 }, { date: 'Tue', amount: 80 }, { date: 'Wed', amount: 45 },
    { date: 'Thu', amount: 0 },  { date: 'Fri', amount: 90 }, { date: 'Sat', amount: 50 }, { date: 'Sun', amount: 40 },
  ],
}

const MOCK_STORIES: Partial<Story>[] = [
  { id: 'mock-1', title: 'Leo the Brave Lion', theme: 'animals', cover_image_url: '', grade_level: 2 },
  { id: 'mock-2', title: 'Zara\'s Space Adventure', theme: 'space', cover_image_url: '', grade_level: 3 },
  { id: 'mock-3', title: 'The Dragon\'s Secret', theme: 'fantasy', cover_image_url: '', grade_level: 4 },
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

  const xpHistory = rewards.xp_history ?? []
  const maxXP = Math.max(...xpHistory.map(d => d.amount), 1)

  return (
    <div className="dash-root">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo">
          <span className="dash-logo-owl">🦉</span>
          <span className="dash-logo-text">ReadQuest</span>
        </div>
        <div className="dash-header-right">
          <button className="dash-nav-btn" onClick={() => navigate('/rewards')}>🏆 Rewards</button>
          <button className="dash-nav-btn ghost" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <main className="dash-main">
        {/* Greeting + XP Row */}
        <div className="dash-top-row">
          <motion.div className="dash-greeting-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="dash-avatar">🦉</div>
            <div>
              <p className="dash-greeting-sub">{greeting}, <strong>{name}</strong>! 👋</p>
              <p className="dash-grade-label">{GRADE_LABELS[grade]}</p>
              <div className="dash-streak">
                <span>🔥</span>
                <span>{rewards.current_streak}-day streak!</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="dash-level-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="dash-level-title">Level {rewards.level}</div>
            <div className="dash-level-name">{rewards.level_name || LEVEL_NAMES[rewards.level]}</div>
            <div className="xp-bar-container">
              <div className="xp-bar-track">
                <motion.div
                  className="xp-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${rewards.xp_progress_pct}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                />
              </div>
              <div className="xp-bar-label">
                <span>⭐ {rewards.total_xp} XP</span>
                <span>{rewards.xp_to_next_level} to next level</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="dash-xp-chart" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <p className="dash-section-label">This week</p>
            <div className="bar-chart">
              {xpHistory.map((d, i) => (
                <div key={i} className="bar-col">
                  <motion.div
                    className="bar-fill"
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.amount / maxXP) * 100}%` }}
                    transition={{ delay: 0.1 * i + 0.3, duration: 0.6, ease: 'easeOut' }}
                    title={`${d.amount} XP`}
                  />
                  <span className="bar-label">{d.date}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* CTA Cards */}
        <div className="dash-cta-row">
          <motion.button
            className="dash-cta-card primary"
            whileHover={{ scale: 1.03, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/generate')}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="cta-icon">✨</span>
            <div>
              <div className="cta-title">Create New Story</div>
              <div className="cta-sub">AI-powered just for you!</div>
            </div>
          </motion.button>

          {stories.length > 0 && (
            <motion.button
              className="dash-cta-card secondary"
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/read/${stories[0].id}`)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <span className="cta-icon">📖</span>
              <div>
                <div className="cta-title">Continue Reading</div>
                <div className="cta-sub">{stories[0].title}</div>
              </div>
            </motion.button>
          )}
        </div>

        {/* Recent Stories */}
        <div className="dash-section">
          <h2 className="dash-section-title">📚 Your Stories</h2>
          <div className="story-grid">
            {stories.map((s, i) => (
              <motion.div
                key={s.id}
                className="story-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i + 0.5 }}
                whileHover={{ y: -6, boxShadow: '0 16px 40px rgba(124,58,237,0.2)' }}
                onClick={() => navigate(`/read/${s.id}`)}
              >
                <div className="story-cover">
                  {s.cover_image_url ? (
                    <img src={s.cover_image_url} alt={s.title} />
                  ) : (
                    <div className="story-cover-placeholder">
                      {THEME_EMOJIS[s.theme || 'animals'] || '📚'}
                    </div>
                  )}
                </div>
                <div className="story-info">
                  <p className="story-title">{s.title}</p>
                  <p className="story-meta">Grade {s.grade_level} · {s.theme}</p>
                </div>
              </motion.div>
            ))}

            {/* "New Story" card */}
            <motion.div
              className="story-card new-story-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * stories.length + 0.5 }}
              whileHover={{ y: -6 }}
              onClick={() => navigate('/generate')}
            >
              <div className="story-cover new-cover">
                <span>+</span>
              </div>
              <div className="story-info">
                <p className="story-title">New Story</p>
                <p className="story-meta">Generate with AI ✨</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Badges preview */}
        <div className="dash-section">
          <div className="dash-section-header">
            <h2 className="dash-section-title">🏆 My Badges</h2>
            <button className="view-all-btn" onClick={() => navigate('/rewards')}>View all →</button>
          </div>
          <div className="badge-row">
            {(rewards.badges ?? []).map((b, i) => (
              <motion.div
                key={b.id}
                className={`badge-chip ${b.earned ? 'earned' : 'locked'}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i + 0.6, type: 'spring', stiffness: 250 }}
                title={b.description}
              >
                <span className="badge-icon">{b.earned ? b.icon : '🔒'}</span>
                <span className="badge-name">{b.name}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick theme browse */}
        <div className="dash-section">
          <h2 className="dash-section-title">🎨 Explore Themes</h2>
          <div className="theme-row">
            {THEMES.map((t, i) => (
              <motion.button
                key={i}
                className="theme-pill"
                whileHover={{ scale: 1.06, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/generate')}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i + 0.7 }}
              >
                {t}
              </motion.button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
