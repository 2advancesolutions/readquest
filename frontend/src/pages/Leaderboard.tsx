import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/leaderboard.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

interface LeaderEntry {
  rank: number
  student_id: string
  name: string
  grade_level: number
  avatar_url: string | null
  total_xp: number
  level: number
  level_name: string
}

const GRADE_LABELS = ['K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']
const LEVEL_COLORS: Record<number, string> = {
  1: '#6b7280',
  2: '#22c55e',
  3: '#3b82f6',
  4: '#a855f7',
  5: '#f59e0b',
}
const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function getAvatarBg(name: string): string {
  const colors = [
    'linear-gradient(135deg,#702ae1,#4f46e5)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
    'linear-gradient(135deg,#ff9a9e,#fecfef)',
    'linear-gradient(135deg,#667eea,#764ba2)',
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}

function XPBar({ xp, level }: { xp: number; level: number }) {
  const XP_PER_LEVEL = 200
  const pct = Math.min((xp % XP_PER_LEVEL) / XP_PER_LEVEL * 100, 100)
  const color = LEVEL_COLORS[level] ?? '#a855f7'
  return (
    <div className="lb-xp-bar-track">
      <motion.div
        className="lb-xp-bar-fill"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{ background: color }}
      />
    </div>
  )
}

export default function Leaderboard() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<LeaderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // Current logged-in student id for "you" highlighting
  const myStudentId = localStorage.getItem('readquest_student_id') ?? ''

  const fetchLeaderboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const res = await fetch(`${API}/api/rewards/leaderboard/global?limit=200`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: LeaderEntry[] = await res.json()
      setEntries(data)
      setError('')
    } catch (e: any) {
      setError('Could not load leaderboard. Please try again.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchLeaderboard() }, [])

  // Filtered + searched list
  const filtered = entries.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
    const matchGrade = gradeFilter === null || e.grade_level === gradeFilter
    return matchSearch && matchGrade
  })

  // Top 3 for podium (always from unfiltered & all grades)
  const top3 = entries.slice(0, 3)

  // Find the current student's rank in the global list
  const myEntry = entries.find(e => e.student_id === myStudentId)

  return (
    <div className="lb-root">
      {/* Animated background */}
      <div className="lb-bg-orb lb-bg-orb-1" />
      <div className="lb-bg-orb lb-bg-orb-2" />
      {Array.from({ length: 35 }).map((_, i) => (
        <div key={i} className="ga-star" style={{
          left: `${(i * 17 + 7) % 97}%`,
          top: `${(i * 29 + 5) % 93}%`,
          width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
          animationDelay: `${(i * 0.29) % 4.5}s`,
          position: 'fixed',
        }} />
      ))}

      {/* Header */}
      <div className="lb-header">
        <button className="ga-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="lb-title-wrap">
          <h1 className="lb-title">🏆 Leaderboard</h1>
          <p className="lb-subtitle">Top readers across ReadQuest — ranked by XP</p>
        </div>
        <button
          className="lb-refresh-btn"
          onClick={() => fetchLeaderboard(true)}
          disabled={refreshing}
          title="Refresh"
        >
          {refreshing ? '⟳' : '↻'}
        </button>
      </div>

      {/* My rank banner (if logged in as student) */}
      {myEntry && (
        <motion.div
          className="lb-my-rank"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="lb-my-rank-label">Your Rank</span>
          <span className="lb-my-rank-num">#{myEntry.rank}</span>
          <span className="lb-my-rank-xp">⚡ {myEntry.total_xp.toLocaleString()} XP</span>
          <span className="lb-my-rank-level" style={{ color: LEVEL_COLORS[myEntry.level] }}>{myEntry.level_name}</span>
        </motion.div>
      )}

      {/* Podium — top 3 */}
      {!loading && !error && top3.length >= 2 && (
        <div className="lb-podium-row">
          {/* 2nd place */}
          <motion.div
            className="lb-podium lb-podium-2"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          >
            <div className="lb-podium-avatar" style={{ background: getAvatarBg(top3[1]?.name ?? '') }}>
              {top3[1]?.avatar_url
                ? <img src={top3[1].avatar_url} alt={top3[1].name} />
                : getInitials(top3[1]?.name ?? '?')}
            </div>
            <div className="lb-podium-medal">🥈</div>
            <div className="lb-podium-name">{top3[1]?.name}</div>
            <div className="lb-podium-xp">⚡ {top3[1]?.total_xp.toLocaleString()}</div>
            <div className="lb-podium-block lb-podium-block-2">2</div>
          </motion.div>

          {/* 1st place */}
          <motion.div
            className="lb-podium lb-podium-1"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <div className="lb-podium-crown">👑</div>
            <div className="lb-podium-avatar lb-podium-avatar-lg" style={{ background: getAvatarBg(top3[0]?.name ?? '') }}>
              {top3[0]?.avatar_url
                ? <img src={top3[0].avatar_url} alt={top3[0].name} />
                : getInitials(top3[0]?.name ?? '?')}
            </div>
            <div className="lb-podium-medal">🥇</div>
            <div className="lb-podium-name">{top3[0]?.name}</div>
            <div className="lb-podium-xp">⚡ {top3[0]?.total_xp.toLocaleString()}</div>
            <div className="lb-podium-block lb-podium-block-1">1</div>
          </motion.div>

          {/* 3rd place */}
          {top3[2] && (
            <motion.div
              className="lb-podium lb-podium-3"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              <div className="lb-podium-avatar" style={{ background: getAvatarBg(top3[2].name) }}>
                {top3[2].avatar_url
                  ? <img src={top3[2].avatar_url} alt={top3[2].name} />
                  : getInitials(top3[2].name)}
              </div>
              <div className="lb-podium-medal">🥉</div>
              <div className="lb-podium-name">{top3[2].name}</div>
              <div className="lb-podium-xp">⚡ {top3[2].total_xp.toLocaleString()}</div>
              <div className="lb-podium-block lb-podium-block-3">3</div>
            </motion.div>
          )}
        </div>
      )}

      {/* Section divider */}
      {!loading && !error && entries.length > 0 && (
        <div className="lb-section-divider">
          <div className="lb-section-divider-line" />
          <span className="lb-section-divider-text">All Rankings</span>
          <div className="lb-section-divider-line" />
        </div>
      )}

      {/* Filters */}
      <div className="lb-filters">
        <div className="lb-search-wrap">
          <span className="lb-search-icon">🔍</span>
          <input
            className="lb-search"
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="lb-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>
        <div className="lb-grade-pills">
          <button
            className={`lb-grade-pill ${gradeFilter === null ? 'active' : ''}`}
            onClick={() => setGradeFilter(null)}
          >All</button>
          {GRADE_LABELS.map((lbl, i) => (
            <button
              key={i}
              className={`lb-grade-pill ${gradeFilter === i ? 'active' : ''}`}
              onClick={() => setGradeFilter(gradeFilter === i ? null : i)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="lb-list">
        {loading && (
          <div className="lb-loading">
            <div className="lb-spinner" />
            <span>Loading rankings…</span>
          </div>
        )}

        {error && (
          <div className="lb-error">
            ⚠️ {error}
            <button className="lb-retry-btn" onClick={() => fetchLeaderboard()}>Try Again</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="lb-empty">
            {search ? `No results for "${search}"` : 'No students yet!'}
          </div>
        )}

        <AnimatePresence>
          {!loading && !error && filtered.map((entry, i) => {
            const isMe = entry.student_id === myStudentId
            const isTop3 = entry.rank <= 3
            return (
              <motion.div
                key={entry.student_id}
                className={`lb-row ${isMe ? 'lb-row-me' : ''} ${isTop3 ? 'lb-row-top' : ''}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2, delay: Math.min(i * 0.025, 0.4) }}
              >
                {/* Rank */}
                <div className="lb-row-rank">
                  {RANK_MEDAL[entry.rank] ?? (
                    <span className="lb-row-rank-num">#{entry.rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div
                  className="lb-row-avatar"
                  style={{ background: entry.avatar_url ? 'transparent' : getAvatarBg(entry.name) }}
                >
                  {entry.avatar_url
                    ? <img src={entry.avatar_url} alt={entry.name} />
                    : getInitials(entry.name)}
                </div>

                {/* Info */}
                <div className="lb-row-info">
                  <div className="lb-row-name">
                    {entry.name}
                    {isMe && <span className="lb-you-badge">YOU</span>}
                  </div>
                  <div className="lb-row-meta">
                    <span className="lb-row-grade">
                      Grade {GRADE_LABELS[entry.grade_level] ?? entry.grade_level}
                    </span>
                    <span
                      className="lb-row-level"
                      style={{ color: LEVEL_COLORS[entry.level] }}
                    >
                      {entry.level_name}
                    </span>
                  </div>
                  <XPBar xp={entry.total_xp} level={entry.level} />
                </div>

                {/* XP */}
                <div className="lb-row-xp">
                  <span className="lb-row-xp-num">
                    {entry.total_xp.toLocaleString()}
                  </span>
                  <span className="lb-row-xp-label">XP</span>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {!loading && !error && filtered.length > 0 && (
          <div className="lb-footer">
            Showing {filtered.length} of {entries.length} students
          </div>
        )}
      </div>
    </div>
  )
}
