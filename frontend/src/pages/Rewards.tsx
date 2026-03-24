import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
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
        <button className="reader-back-btn rew-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <h1 className="rew-header-title">🏆 My Rewards</h1>
        <div />
      </div>

      {/* Hero section */}
      <div className="rew-hero">
        <motion.div className="rew-level-circle" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200 }}>
          <div className="rew-level-num">{rewards.level}</div>
          <div className="rew-level-icon">⭐</div>
        </motion.div>
        <div className="rew-hero-text">
          <motion.h2 className="rew-level-name" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            {rewards.level_name || LEVEL_NAMES[rewards.level]}
          </motion.h2>
          <motion.div className="rew-xp-total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
            ⭐ {rewards.total_xp} XP total • 🔥 {rewards.current_streak}-day streak
          </motion.div>
          <div className="rew-xp-bar-wrap">
            <div className="rew-xp-bar-track">
              <motion.div
                className="rew-xp-bar-fill"
                initial={{ width: 0 }}
                animate={{ width: `${rewards.xp_progress_pct}%` }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.4 }}
              />
            </div>
            <p className="rew-xp-bar-label">{rewards.xp_to_next_level} XP to next level</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rew-tabs">
        {(['overview','badges','leaderboard'] as const).map(t => (
          <button key={t} className={`rew-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 Overview' : t === 'badges' ? '🏅 Badges' : '🏆 Leaderboard'}
          </button>
        ))}
      </div>

      <div className="rew-content">
        {tab === 'overview' && (
          <div className="rew-overview">
            {/* Weekly XP Chart */}
            <div className="rew-card">
              <h3 className="rew-card-title">📈 This Week's XP</h3>
              <div className="rew-bar-chart">
                {xpHistory.map((d, i) => (
                  <div key={i} className="rew-bar-col">
                    <span className="rew-bar-val">{d.amount > 0 ? d.amount : ''}</span>
                    <div className="rew-bar-track-v">
                      <motion.div
                        className="rew-bar-fill-v"
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.amount / maxXP) * 100}%` }}
                        transition={{ delay: 0.1 * i + 0.3, duration: 0.6, ease: 'easeOut' }}
                        style={{ background: d.amount === 0 ? '#E5E7EB' : undefined }}
                      />
                    </div>
                    <span className="rew-bar-lbl">{d.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Streak calendar */}
            <div className="rew-card">
              <h3 className="rew-card-title">🔥 Reading Streak — {rewards.current_streak} Days!</h3>
              <div className="streak-week">
                {STREAK_DAYS.map((day, i) => (
                  <motion.div
                    key={i}
                    className={`streak-day ${ACTIVE_STREAK_DAYS.includes(i) ? 'active' : ''}`}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.06 * i + 0.5, type: 'spring', stiffness: 250 }}
                  >
                    <span className="streak-icon">{ACTIVE_STREAK_DAYS.includes(i) ? '🔥' : '○'}</span>
                    <span className="streak-label">{day}</span>
                  </motion.div>
                ))}
              </div>
              <p className="streak-msg">Keep it going! Read today to extend your streak 💪</p>
            </div>

            {/* Next level info */}
            <div className="rew-card next-level-card">
              <h3 className="rew-card-title">🎯 Next Level: {LEVEL_NAMES[(rewards.level + 1) as keyof typeof LEVEL_NAMES] || 'Max Level!'}</h3>
              <p className="rew-card-sub">Earn <strong>{rewards.xp_to_next_level} more XP</strong> to level up!</p>
              <div className="rew-xp-tips">
                {[{ act: 'Read a page', xp: '+5 XP', icon: '📖' }, { act: 'Correct quiz answer', xp: '+10 XP', icon: '✅' }, { act: 'Complete a book', xp: '+50 XP', icon: '🎉' }, { act: 'Daily login', xp: '+15 XP', icon: '☀️' }].map((tip, i) => (
                  <div key={i} className="xp-tip">
                    <span>{tip.icon}</span><span>{tip.act}</span>
                    <span className="xp-tip-val">{tip.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'badges' && (
          <div className="rew-badges-grid">
            {(rewards.badges ?? []).map((b, i) => (
              <motion.div
                key={b.id}
                className={`rew-badge-card ${b.earned ? 'earned' : 'locked'}`}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.06 * i, type: 'spring', stiffness: 250 }}
              >
                <div className="rew-badge-icon">{b.earned ? b.icon : '🔒'}</div>
                <div className="rew-badge-name">{b.name}</div>
                <div className="rew-badge-desc">{b.description}</div>
                {b.earned && b.earned_at && (
                  <div className="rew-badge-date">Earned ✓</div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div className="rew-leaderboard">
            <p className="rew-leaderboard-sub">Top readers this week! 🌟</p>
            {leaderboard.map((entry, i) => {
              const isMe = entry.student_id === 'demo-student-1'
              return (
                <motion.div
                  key={entry.student_id}
                  className={`lb-row ${isMe ? 'me' : ''} ${i < 3 ? 'top-three' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                >
                  <div className="lb-rank">{RANK_ICONS[entry.rank - 1] || entry.rank}</div>
                  <div className="lb-avatar">{entry.name[0].toUpperCase()}</div>
                  <div className="lb-info">
                    <div className="lb-name">{entry.name}{isMe ? ' (You!)' : ''}</div>
                    <div className="lb-level">{entry.level_name}</div>
                  </div>
                  <div className="lb-xp">⭐ {entry.total_xp} XP</div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
