import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { rewardsApi } from '../services/api'
import type { StudentRewards, LeaderboardEntry } from '../types'
import { LEVEL_NAMES, XP_PER_LEVEL } from '../types'
import '../styles/rewards.css'

const MOCK_REWARDS: StudentRewards = {
  total_xp: 340, level: 2, level_name: 'Story Explorer 🗺️',
  xp_to_next_level: 60, xp_progress_pct: 70, current_streak: 5,
  badges: [
    { id: '1', slug: 'first_book',  name: 'First Book!',   icon: '📖', description: 'Read your first book',          earned: true,  earned_at: '2024-01-01' },
    { id: '2', slug: 'streak_3',    name: '3-Day Streak',  icon: '🔥', description: 'Read 3 days in a row',          earned: true,  earned_at: '2024-01-03' },
    { id: '3', slug: 'quiz_master', name: 'Quiz Master',   icon: '🧠', description: 'Get 5 quiz questions right',    earned: false },
    { id: '4', slug: 'speed_reader',name: 'Speed Reader',  icon: '⚡', description: 'Read a book in under 10 min',  earned: false },
    { id: '5', slug: 'streak_7',    name: '7-Day Streak',  icon: '🏆', description: 'Read 7 days in a row',         earned: false },
    { id: '6', slug: 'explorer',    name: 'Genre Explorer',icon: '🗺️', description: 'Read books in 3 different themes', earned: false },
    { id: '7', slug: 'bookworm',    name: 'Bookworm',      icon: '🐛', description: 'Complete 5 books',             earned: false },
    { id: '8', slug: 'word_wizard', name: 'Word Wizard',   icon: '🔮', description: 'Reach level 3',               earned: false },
  ],
  xp_history: [
    { date: 'Mon', amount: 35 }, { date: 'Tue', amount: 80 }, { date: 'Wed', amount: 45 },
    { date: 'Thu', amount: 0  }, { date: 'Fri', amount: 90 }, { date: 'Sat', amount: 50 }, { date: 'Sun', amount: 40 },
  ],
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { student_id: '1', name: 'Zara',  avatar_url: '', total_xp: 920, level: 5, level_name: 'Legend 🌟', rank: 1 },
  { student_id: '2', name: 'Kai',   avatar_url: '', total_xp: 740, level: 4, level_name: 'Reading Champion 🏆', rank: 2 },
  { student_id: '3', name: 'Mia',   avatar_url: '', total_xp: 600, level: 3, level_name: 'Word Wizard 🔮', rank: 3 },
  { student_id: 'demo-student-1', name: localStorage.getItem('readquest_student_name') || 'You', avatar_url: '', total_xp: 340, level: 2, level_name: 'Story Explorer 🗺️', rank: 4 },
  { student_id: '5', name: 'Eli',   avatar_url: '', total_xp: 180, level: 1, level_name: 'Bookworm 🐛', rank: 5 },
]

const RANK_ICONS = ['🥇','🥈','🥉','4️⃣','5️⃣']
const STREAK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
const ACTIVE_STREAK_DAYS = [0, 1, 2, 4, 5, 6] // mock — Mon,Tue,Wed,Fri,Sat,Sun active

export default function Rewards() {
  const navigate = useNavigate()
  const [rewards, setRewards] = useState<StudentRewards>(MOCK_REWARDS)
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD)
  const [tab, setTab] = useState<'overview' | 'badges' | 'leaderboard'>('overview')
  const name = localStorage.getItem('readquest_student_name') || 'Reader'

  useEffect(() => {
    rewardsApi.getXP().then(r => setRewards(prev => ({ ...prev, ...r.data }))).catch(() => {})
    rewardsApi.getLeaderboard().then(r => setLeaderboard(r.data)).catch(() => {})
    // Update mock leaderboard with real name
    setLeaderboard(prev => prev.map(e => e.student_id === 'demo-student-1' ? { ...e, name } : e))
  }, [name])

  const xpHistory = rewards.xp_history ?? []
  const maxXP = Math.max(...xpHistory.map(d => d.amount), 1)

  return (
    <div className="rew-root">
      {/* Header */}
      <div className="rew-header">
        <button className="rew-back-btn" onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Dashboard
        </button>
        <h1 className="rew-header-title">Progress & Metrics</h1>
        <div />
      </div>

      {/* Hero section */}
      <div className="rew-hero">
        <div className="rew-hero-content">
          <motion.div className="rew-level-circle" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <div className="rew-level-label">Level</div>
            <div className="rew-level-num">{rewards.level}</div>
          </motion.div>

          <div className="rew-hero-text">
            <motion.h2 className="rew-level-name" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
              {rewards.level_name || LEVEL_NAMES[rewards.level]}
            </motion.h2>

            <motion.div className="rew-stats-row" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <div className="rew-stat">
                <span className="rew-stat-val">{rewards.total_xp}</span>
                <span className="rew-stat-lbl">Total XP</span>
              </div>
              <div className="rew-stat-divider" />
              <div className="rew-stat">
                <span className="rew-stat-val">{rewards.current_streak}</span>
                <span className="rew-stat-lbl">Day Streak</span>
              </div>
            </motion.div>

            <motion.div className="rew-xp-bar-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <div className="rew-xp-bar-track">
                <motion.div
                  className="rew-xp-bar-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${rewards.xp_progress_pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
                />
              </div>
              <div className="rew-xp-bar-labels">
                <span>{rewards.total_xp} XP</span>
                <span>{rewards.xp_to_next_level} XP to level up</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rew-tabs-wrap">
        <div className="rew-tabs">
          {(['overview','badges','leaderboard'] as const).map(t => (
            <button key={t} className={`rew-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'overview' ? 'Overview' : t === 'badges' ? 'Achievements' : 'Leaderboard'}
            </button>
          ))}
        </div>
      </div>

      <div className="rew-content">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" className="rew-overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {/* Weekly XP Chart */}
              <div className="rew-card">
                <h3 className="rew-card-title">Weekly Activity</h3>
                <div className="rew-bar-chart">
                  {xpHistory.map((d, i) => (
                    <div key={i} className="rew-bar-col">
                      <span className="rew-bar-val">{d.amount > 0 ? d.amount : ''}</span>
                      <div className="rew-bar-track-v">
                        <motion.div
                          className="rew-bar-fill-v"
                          initial={{ height: 0 }}
                          animate={{ height: `${(d.amount / maxXP) * 100}%` }}
                          transition={{ delay: 0.1 * i + 0.1, duration: 0.6, ease: 'easeOut' }}
                          style={{ background: d.amount === 0 ? 'var(--rq-bg-alt)' : undefined }}
                        />
                      </div>
                      <span className="rew-bar-lbl">{d.date.charAt(0)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streak calendar */}
              <div className="rew-card">
                <h3 className="rew-card-title">Reading Consistency</h3>
                <div className="streak-week">
                  {STREAK_DAYS.map((day, i) => (
                    <div key={i} className={`streak-day ${ACTIVE_STREAK_DAYS.includes(i) ? 'active' : ''}`}>
                      <div className="streak-circle">
                        {ACTIVE_STREAK_DAYS.includes(i) && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <span className="streak-label">{day.charAt(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {tab === 'badges' && (
            <motion.div key="badges" className="rew-badges-grid" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              {(rewards.badges ?? []).map((b, i) => (
                <div key={b.id} className={`rew-badge-card ${b.earned ? 'earned' : 'locked'}`}>
                  <div className="rew-badge-icon">
                    {b.earned ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    )}
                  </div>
                  <div className="rew-badge-info">
                    <div className="rew-badge-name">{b.name}</div>
                    <div className="rew-badge-desc">{b.description}</div>
                  </div>
                  {b.earned && <div className="rew-badge-status">Completed</div>}
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'leaderboard' && (
            <motion.div key="leaderboard" className="rew-leaderboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}>
              <div className="lb-header">
                <div className="lb-col-rank">Rank</div>
                <div className="lb-col-user">User</div>
                <div className="lb-col-score">Total XP</div>
              </div>

              <div className="lb-body">
                {leaderboard.map((entry, i) => {
                  const isMe = entry.student_id === 'demo-student-1'
                  return (
                    <div key={entry.student_id} className={`lb-row ${isMe ? 'me' : ''}`}>
                      <div className="lb-col-rank">
                        <span className={`rank-num rank-${entry.rank}`}>{entry.rank}</span>
                      </div>
                      <div className="lb-col-user">
                        <div className="lb-avatar">{entry.name[0].toUpperCase()}</div>
                        <div className="lb-info">
                          <div className="lb-name">{entry.name}{isMe ? ' (You)' : ''}</div>
                          <div className="lb-level">{entry.level_name}</div>
                        </div>
                      </div>
                      <div className="lb-col-score">
                        <span className="score-val">{entry.total_xp}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
