import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { spellingApi, SpellingSessionOut, SpellingStatsOut } from '../services/api'
import { supabase } from '../lib/supabase'
import StudentDropdown from '../components/StudentDropdown'
import '../styles/spelling-scores.css'

// ── Gauge helpers ────────────────────────────────────────────────────────────
const GAUGE_R      = 90
const GAUGE_CX     = 130
const GAUGE_CY     = 120
const START_ANGLE  = 180
const END_ANGLE    = 0
const CIRCUMFERENCE = Math.PI * GAUGE_R

const CHILD_COLORS = ['#702AE1','#F59E0B','#10B981','#3B82F6','#EC4899','#F97316']

type Child = { id: string; name: string; grade_level: number }

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) }
}

function gaugePath(cx: number, cy: number, r: number) {
  const start = polarToCartesian(cx, cy, r, START_ANGLE)
  const end   = polarToCartesian(cx, cy, r, END_ANGLE)
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
}

function getPctColor(pct: number) {
  if (pct >= 70) return '#22c55e'
  if (pct >= 40) return '#f59e0b'
  return '#ef4444'
}

function getAccClass(pct: number) {
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'mid'
  return 'low'
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function shortName(name: string) {
  return name.split(' ')[0] || name
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SpellingScores() {
  const navigate = useNavigate()

  // ── Children / student switcher ─────────────────────────────────────────────
  const [children, setChildren]           = useState<Child[]>([])
  // null = "All Students" (aggregate), a Child = filter to that child
  const [selectedChild, setSelectedChild]   = useState<Child | null>(null)
  const [childrenLoaded, setChildrenLoaded] = useState(false)
  // ── Missed words modal ─────────────────────────────────────────────
  const [selectedSession, setSelectedSession] = useState<SpellingSessionOut | null>(null)

  // ── Scores data ──────────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<SpellingSessionOut[]>([])
  const [stats, setStats]       = useState<SpellingStatsOut | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Gauge animation
  const [gaugePct, setGaugePct] = useState(0)
  const mountedRef = useRef(false)

  // ── Load parent's children on mount ──────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { setChildrenLoaded(true); return }

      const savedId = localStorage.getItem('readquest_student_id')

      fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`)
        .then(r => r.ok ? r.json() : [])
        .then((data) => {
          const list: Child[] = Array.isArray(data) ? data : []
          setChildren(list)
          const match = list.find(c => c.id === savedId) ?? list[0] ?? null
          setSelectedChild(match)
          setChildrenLoaded(true)
        })
        .catch(() => setChildrenLoaded(true))
    })
    mountedRef.current = true
  }, [])

  // ── Reload scores when selected child changes ─────────────────────────────────
  useEffect(() => {
    if (!childrenLoaded) return
    const studentId = selectedChild?.id || localStorage.getItem('readquest_student_id') || ''
    if (!studentId) { setLoading(false); return }

    setLoading(true)
    setError('')
    setGaugePct(0)

    Promise.all([
      spellingApi.getHistory(studentId),
      spellingApi.getStats(studentId),
    ])
      .then(([histRes, statsRes]) => {
        setSessions(histRes.data)
        setStats(statsRes.data)
        setTimeout(() => setGaugePct(statsRes.data.accuracy_pct), 300)
      })
      .catch(() => setError('Could not load spelling scores. Please try again.'))
      .finally(() => setLoading(false))
  }, [selectedChild, childrenLoaded])

  // ── Gauge SVG math ──────────────────────────────────────────────────────────
  const dashOffset = CIRCUMFERENCE - (gaugePct / 100) * CIRCUMFERENCE
  const gaugeColor = getPctColor(gaugePct)
  const trackPath  = gaugePath(GAUGE_CX, GAUGE_CY, GAUGE_R)

  const masteryPct = stats && stats.total_attempts > 0
    ? Math.round((stats.words_mastered / Math.max(stats.words_mastered + 5, 1)) * 100)
    : 0

  const overallPct = stats?.accuracy_pct ?? 0

  const studentName = selectedChild?.name
    || localStorage.getItem('readquest_student_name')
    || 'Student'

  // ── Switch child ────────────────────────────────────────────────────────────
  const handleSelectChild = (child: Child | null) => {
    setSelectedChild(child)
    if (!child) return
    localStorage.setItem('readquest_student_id', child.id)
    localStorage.setItem('readquest_student_name', child.name)
    localStorage.setItem('readquest_student_grade', String(child.grade_level ?? 1))
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading && !childrenLoaded) return (
    <div className="ss-root">
      <div className="ss-loading">
        <div className="ss-spinner" />
        <span>Loading scores…</span>
      </div>
    </div>
  )

  return (
    <>
    <div className="ss-root">

      {/* Top bar */}
      <div className="ss-topbar">
        <button className="ss-back-btn" onClick={() => navigate('/dashboard')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Dashboard
        </button>

        {/* Student dropdown — shown any time we have at least one child */}
        {children.length > 0 && (
          <StudentDropdown
            children={children}
            selected={selectedChild}
            onChange={handleSelectChild}
            allowAll={children.length > 1}
          />
        )}
      </div>

      {/* Header */}
      <motion.div
        className="ss-header"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        key={selectedChild?.id}
      >
        <span className="ss-header-icon">📝</span>
        <h1>Spelling Progress</h1>
        <p className="ss-header-sub">{studentName} — Spelling Scores & History</p>
      </motion.div>

      {error && (
        <p style={{ color: '#f87171', textAlign: 'center', marginTop: 16 }}>{error}</p>
      )}

      {/* Loading overlay while switching child */}
      <AnimatePresence>
        {loading && childrenLoaded && (
          <motion.div
            className="ss-loading ss-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="ss-spinner" />
            <span>Loading scores…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GAUGE METER ── */}
      <motion.div
        className="ss-gauge-section"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15 }}
        key={`gauge-${selectedChild?.id}`}
      >
        <div className="ss-gauge-wrap">
          <svg
            className="ss-gauge-svg"
            viewBox="0 0 260 130"
            aria-label={`Overall spelling accuracy: ${overallPct}%`}
          >
            {/* Track */}
            <path
              className="ss-gauge-track"
              d={trackPath}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={0}
            />

            {/* Zone color hints */}
            <path
              d={trackPath}
              fill="none"
              strokeWidth={18}
              strokeLinecap="round"
              stroke="url(#gaugeGradient)"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={0}
              opacity={0.08}
            />

            {/* Active fill */}
            <path
              className="ss-gauge-fill"
              d={trackPath}
              stroke={gaugeColor}
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ filter: `drop-shadow(0 0 8px ${gaugeColor}80)` }}
            />

            <defs>
              <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#ef4444" />
                <stop offset="40%"  stopColor="#f59e0b" />
                <stop offset="70%"  stopColor="#22c55e" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>
            </defs>

            {/* Zone tick marks */}
            {[40, 70].map(zone => {
              const angleDeg = 180 - (zone / 100) * 180
              const inner = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R - 14, angleDeg)
              const outer = polarToCartesian(GAUGE_CX, GAUGE_CY, GAUGE_R + 6, angleDeg)
              return (
                <line
                  key={zone}
                  className="ss-gauge-tick"
                  x1={inner.x} y1={inner.y}
                  x2={outer.x} y2={outer.y}
                />
              )
            })}
          </svg>

          {/* Center label */}
          <div className="ss-gauge-center">
            <motion.span
              className="ss-gauge-pct"
              style={{ color: gaugeColor }}
              animate={{ opacity: [0.6, 1] }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              {Math.round(gaugePct)}%
            </motion.span>
            <span className="ss-gauge-label">Overall Accuracy</span>
          </div>
        </div>

        {/* Zone labels */}
        <div className="ss-gauge-zones">
          <span className="ss-zone-label red">Needs Work</span>
          <span className="ss-zone-label amber">Good</span>
          <span className="ss-zone-label green">Excellent</span>
        </div>
      </motion.div>

      {/* ── STAT CARDS ── */}
      <motion.div
        className="ss-stats-grid"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        key={`stats-${selectedChild?.id}`}
      >
        {[
          { icon: '📋', value: stats?.total_sessions ?? 0,   label: 'Tests Taken',     featured: false },
          { icon: '⭐', value: stats?.words_mastered ?? 0,   label: 'Words Mastered',  featured: false },
          { icon: '🎯', value: `${overallPct}%`,             label: 'Overall Accuracy', featured: true  },
          { icon: '⚡', value: sessions.reduce((s,r) => s + r.xp_earned, 0), label: 'Total XP', featured: false },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            className={`ss-stat-card ${card.featured ? 'featured' : ''}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.07 }}
          >
            <span className="ss-stat-icon">{card.icon}</span>
            <span className="ss-stat-value">{card.value}</span>
            <span className="ss-stat-label">{card.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* ── MASTERY PROGRESS BAR ── */}
      {stats && stats.words_mastered > 0 && (
        <motion.div
          className="ss-progress-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <div className="ss-progress-header">
            <span className="ss-progress-title">⭐ Words Mastered</span>
            <span className="ss-progress-count">
              {stats.words_mastered} mastered · {stats.total_attempts} total practiced
            </span>
          </div>
          <div className="ss-progress-track">
            <div
              className="ss-progress-fill"
              style={{ width: `${Math.min(masteryPct, 100)}%` }}
            />
          </div>
        </motion.div>
      )}

      {/* ── ACCURACY PROGRESS BAR ── */}
      {stats && stats.total_attempts > 0 && (
        <motion.div
          className="ss-progress-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="ss-progress-header">
            <span className="ss-progress-title">🎯 Overall Accuracy</span>
            <span className="ss-progress-count">
              {stats.correct_attempts} correct out of {stats.total_attempts} attempts
            </span>
          </div>
          <div className="ss-progress-track">
            <div
              className="ss-progress-fill"
              style={{ width: `${overallPct}%`, background: `linear-gradient(90deg, ${getPctColor(overallPct)}, ${getPctColor(overallPct)}aa)` }}
            />
          </div>
        </motion.div>
      )}

      {/* ── SESSION HISTORY ── */}
      <motion.div
        className="ss-history-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.55 }}
        key={`history-${selectedChild?.id}`}
      >
        <h2 className="ss-history-title">📅 Test History</h2>

        {sessions.length === 0 && !loading ? (
          <div className="ss-empty">
            <span className="ss-empty-icon">🌟</span>
            <h3>No tests yet!</h3>
            <p>Complete a spelling session to see your scores here.</p>
          </div>
        ) : (
          <div className="ss-history-list">
            {sessions.map((s, i) => {
              const accClass = getAccClass(s.accuracy_pct)
              const barColor = getPctColor(s.accuracy_pct)
              const hasMissed = s.missed_words && s.missed_words.length > 0
              return (
                <motion.div
                  key={s.session_id}
                  className={`ss-session-card${hasMissed ? ' clickable' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.6 + i * 0.05 }}
                  onClick={hasMissed ? () => setSelectedSession(s) : undefined}
                  title={hasMissed ? 'Click to see missed words' : undefined}
                >
                  {/* Left — character + date */}
                  <div className="ss-session-left">
                    <div className="ss-session-char">
                      {shortName(s.character_name)}
                    </div>
                    <span className="ss-session-date">
                      {formatDate(s.started_at || s.completed_at)}
                    </span>
                  </div>

                  {/* Middle — score + mini bar */}
                  <div className="ss-session-middle">
                    <span className="ss-session-score-text">
                      {s.correct_count}/{s.total_words} correct
                    </span>
                    <div className="ss-session-mini-bar-track">
                      <div
                        className="ss-session-mini-bar-fill"
                        style={{
                          width: `${s.accuracy_pct}%`,
                          background: barColor,
                          boxShadow: `0 0 6px ${barColor}60`,
                        }}
                      />
                    </div>
                    {hasMissed && (
                      <span className="ss-session-missed-hint">
                        ❌ {s.missed_words.length} missed — tap to review
                      </span>
                    )}
                  </div>

                  {/* Right — accuracy pill + XP */}
                  <div className="ss-session-right">
                    <span className={`ss-acc-pill ${accClass}`}>
                      {s.accuracy_pct}%
                    </span>
                    {s.xp_earned > 0 && (
                      <span className="ss-xp-label">+{s.xp_earned} XP</span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ── CTA ── */}
      <div className="ss-cta">
        <button className="ss-cta-btn" onClick={() => navigate('/spelling')}>
          🎮 Practice Spelling
        </button>
      </div>

    </div>

    {/* ── Missed Words Modal ── */}
    <AnimatePresence>
      {selectedSession && (
        <motion.div
          className="ss-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedSession(null)}
        >
          <motion.div
            className="ss-modal"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.22 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="ss-modal-header">
              <div className="ss-modal-title-row">
                <span className="ss-modal-icon">📋</span>
                <h3 className="ss-modal-title">Missed Words</h3>
                <span className="ss-modal-subtitle">
                  {formatDate((selectedSession?.started_at || selectedSession?.completed_at) ?? null)}
                  {' · '}{shortName(selectedSession?.character_name ?? '')}
                </span>
              </div>
              <button className="ss-modal-close" onClick={() => setSelectedSession(null)}>✕</button>
            </div>

            {(selectedSession?.missed_words?.length ?? 0) === 0 ? (
              <div className="ss-modal-empty">
                <span>🎉</span>
                <p>No missed words — perfect score!</p>
              </div>
            ) : (
              <div className="ss-modal-body">
                <p className="ss-modal-count">
                  {selectedSession?.missed_words.length} word{(selectedSession?.missed_words.length ?? 0) !== 1 ? 's' : ''} to practice:
                </p>
                <div className="ss-modal-word-grid">
                  {selectedSession?.missed_words.map((word, i) => (
                    <motion.div
                      key={word}
                      className="ss-modal-word-chip"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <span className="ss-modal-word-x">✕</span>
                      {word}
                    </motion.div>
                  ))}
                </div>
                <p className="ss-modal-hint">💡 These words will show up in your next "My Words" spelling session!</p>
              </div>
            )}

            <div className="ss-modal-actions">
              <button className="ss-modal-btn" onClick={() => navigate('/spelling')}>
                🎮 Practice These Words
              </button>
              <button className="ss-modal-btn secondary" onClick={() => setSelectedSession(null)}>
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
