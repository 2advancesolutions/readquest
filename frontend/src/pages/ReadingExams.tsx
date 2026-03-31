import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { examsApi } from '../services/api'
import { supabase } from '../lib/supabase'
import StudentDropdown from '../components/StudentDropdown'

import { preloadSpellingWelcome } from '../lib/spellingWelcome'
import {
  preloadExamTutorial,
  autoPlayExamTutorial, firstNameOnly,
} from '../lib/examTutorial'
import {
  ReadingExam, ExamQuestion, ExamResult, ExamHistoryItem,
  GradeReadiness, SectionStatus, EXAM_SECTIONS, GRADE_LABELS,
} from '../types'
import '../styles/exams.css'

type View = 'hub' | 'generating' | 'testing' | 'results'
type Child = { id: string; name: string; grade_level: number; school?: string }

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}
function getTimerClass(rem: number, total: number) {
  const p = rem / total
  return p <= 0.1 ? 'danger' : p <= 0.25 ? 'warning' : ''
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function getStrandColor(strand: string) {
  const m: Record<string, string> = {
    phonics: '#60a5fa', vocabulary: '#c084fc',
    comprehension: '#4ade80', grammar: '#fbbf24', mixed: '#f87171',
  }
  return m[strand] ?? '#c084fc'
}

// ── Generating Screen helpers (module-level) ─────────────────────────────────

const RELIABLE_CHARS = [
  { name: 'Pikachu',      img: 'https://upload.wikimedia.org/wikipedia/en/thumb/a/a6/Pok%C3%A9mon_Pikachu_art.png/250px-Pok%C3%A9mon_Pikachu_art.png' },
  { name: 'Stitch',       img: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d2/Stitch_%28Lilo_%26_Stitch%29.svg/250px-Stitch_%28Lilo_%26_Stitch%29.svg.png' },
  { name: 'Elsa',         img: 'https://upload.wikimedia.org/wikipedia/en/5/5e/Elsa_from_Disney%27s_Frozen.png' },
  { name: 'Moana',        img: 'https://upload.wikimedia.org/wikipedia/en/5/56/Moana_%28character%29.png' },
  { name: 'Mario',        img: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5c/Mario_by_Shigehisa_Nakaue.png/250px-Mario_by_Shigehisa_Nakaue.png' },
  { name: 'SpongeBob',    img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/SpongeBob_SquarePants_character.png/250px-SpongeBob_SquarePants_character.png' },
  { name: 'Sonic',        img: 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4a/Sonic_the_Hedgehog_-_rendering.png/250px-Sonic_the_Hedgehog_-_rendering.png' },
  { name: 'Mickey Mouse', img: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Mickey_Mouse_%28poster_version%29.svg/250px-Mickey_Mouse_%28poster_version%29.svg.png' },
  { name: 'Simba',        img: 'https://upload.wikimedia.org/wikipedia/en/9/94/Simba_%28_Disney_character_-_adult%29.png' },
  { name: 'Rapunzel',     img: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6a/Rapunzel_tangled.png/250px-Rapunzel_tangled.png' },
  { name: 'Shrek',        img: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b7/Shrek.png/250px-Shrek.png' },
  { name: 'Toothless',    img: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/96/Toothless_HTTYD.png/250px-Toothless_HTTYD.png' },
]



// ── Voice Tutorial Hook (manual 🔊 button) ──────────────────────────────────────────

function useTutorialVoice(studentId: string, studentName: string) {
  const [speaking, setSpeaking] = useState(false)

  const play = useCallback(() => {
    if (speaking) { setSpeaking(false); return }
    const firstName = firstNameOnly(studentName)
    setSpeaking(true)
    autoPlayExamTutorial(studentId, firstName, () => setSpeaking(false))
  }, [speaking, studentId, studentName])

  return { speaking, play }
}

// ── Readiness Banner ──────────────────────────────────────────────────────────

function ReadinessBanner({ readiness }: { readiness: GradeReadiness | null }) {
  if (!readiness) return null
  const gradeLabel = GRADE_LABELS[readiness.student_grade] ?? `Grade ${readiness.student_grade}`
  const nextLabel  = GRADE_LABELS[readiness.student_grade + 1] ?? `Grade ${readiness.student_grade + 1}`

  const examsPct = Math.min(100, Math.round((readiness.total_passed_exams / readiness.required_exams) * 100))
  const booksPct = Math.min(100, Math.round((readiness.books_read / readiness.required_books) * 100))
  const scorePct = Math.min(100, Math.round((readiness.overall_avg_score / readiness.required_avg) * 100))
  const pillars = [
    { label: 'Exams', cur: readiness.total_passed_exams, req: readiness.required_exams, pct: examsPct, done: examsPct >= 100 },
    { label: 'Books',  cur: readiness.books_read,         req: readiness.required_books,  pct: booksPct,  done: booksPct  >= 100 },
    { label: 'Avg Score', cur: `${readiness.overall_avg_score}%`, req: `${readiness.required_avg}%`, pct: scorePct, done: scorePct >= 100 },
  ]

  return (
    <div className={`exam-readiness-banner${readiness.ready_for_next_grade ? ' ready' : ''}`}>
      <div className="exam-readiness-icon">
        {readiness.ready_for_next_grade ? '🎓' : readiness.any_section_maxed_retakes ? '⚠️' : '📊'}
      </div>
      <div className="exam-readiness-info" style={{ flex: 1 }}>
        <div className="exam-readiness-label">
          {readiness.ready_for_next_grade
            ? `🎉 ${gradeLabel} Complete! You're ready for ${nextLabel}!`
            : readiness.any_section_maxed_retakes
            ? `⚠️ A section has exceeded max retakes — progress must be reset`
            : `${gradeLabel} — Grade Readiness Progress`}
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10 }}>
          {pillars.map(p => (
            <div key={p.label} style={{ minWidth: 130, flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'rgba(192,132,252,0.7)', fontWeight: 700, marginBottom: 5 }}>
                {p.done ? '✅' : '○'} {p.label}: {p.cur} / {p.req}
              </div>
              <div className="exam-readiness-bar-wrap">
                <div className="exam-readiness-bar" style={{ width: `${p.pct}%`, background: p.done ? 'linear-gradient(90deg,#4ade80,#22c55e)' : undefined }} />
              </div>
            </div>
          ))}
        </div>
        {readiness.any_section_maxed_retakes && (
          <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: 8 }}>
            ⚠️ You used all retakes on a section without passing. Reset progress to try again.
          </div>
        )}
      </div>
      {readiness.ready_for_next_grade && (
        <div className="exam-ready-badge">🏆 Grade Ready!</div>
      )}
    </div>
  )
}

// ── Retake Indicator ──────────────────────────────────────────────────────────

function RetakeIndicator({ sec }: { sec: SectionStatus }) {
  if (sec.total_attempts === 0) return <span className="exam-section-last-score untaken">Not taken yet</span>
  const dots = [0, 1, 2].map(i => {
    const used = i < sec.retake_number
    const isLast = i === 2
    return (
      <span
        key={i}
        style={{
          display: 'inline-block',
          width: 10, height: 10, borderRadius: '50%',
          background: used ? (isLast ? '#f87171' : '#fbbf24') : 'rgba(255,255,255,0.12)',
          border: '1.5px solid rgba(255,255,255,0.18)',
          marginRight: 4,
        }}
        title={used ? (i === 0 ? 'First try' : `Retake ${i}`) : 'Available'}
      />
    )
  })
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {sec.passed
        ? <span className="exam-section-last-score passed">✓ Passed {sec.best_score}%</span>
        : <span className="exam-section-last-score failed">✗ Best: {sec.best_score}%</span>}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {dots}
        <span style={{ fontSize: '0.7rem', color: 'rgba(192,132,252,0.6)', marginLeft: 2 }}>
          {sec.retakes_remaining} left
        </span>
      </div>
    </div>
  )
}

// ── Hub View ─────────────────────────────────────────────────────────────────

function HubView({
  history, readiness, studentGrade, studentFirstName, onStart, onReview, onReset, loadingHistory,
}: {
  history: ExamHistoryItem[]
  readiness: GradeReadiness | null
  studentGrade: number
  studentFirstName: string
  onStart: (section: string, isPractice: boolean) => void
  onReview: (item: ExamHistoryItem) => void
  onReset: () => void
  loadingHistory: boolean
}) {
  const sectionMap: Record<string, SectionStatus> = {}
  readiness?.sections.forEach(s => { sectionMap[s.section] = s })

  const REAL_SECTIONS = ['phonics', 'vocabulary', 'comprehension', 'grammar', 'mixed']
  const gradeLabel  = GRADE_LABELS[studentGrade] ?? `Grade ${studentGrade}`

  const nextExamNum     = readiness ? Math.min(readiness.total_passed_exams + 1, 10) : 1
  const difficultyLabel = nextExamNum <= 5 ? '⭐ Easy' : nextExamNum <= 8 ? '⭐⭐ Medium' : '⭐⭐⭐ Hard'

  return (
    <div className="exam-hub">
      <div className="exam-hub-hero">
        <div className="exam-hub-badge">📝 Reading Exam Center</div>
        <h1 className="exam-hub-title">
          {gradeLabel} Exams
          {studentFirstName && <span style={{ color: 'rgba(192,132,252,0.55)', fontWeight: 400, fontSize: '1.1rem' }}> — {studentFirstName}</span>}
        </h1>
        <p className="exam-hub-sub">
          Exam #{nextExamNum} of 10 · {difficultyLabel} · Must pass 10 exams with 80%+ average to advance to {GRADE_LABELS[studentGrade + 1] ?? 'next grade'}
        </p>
      </div>

      <ReadinessBanner readiness={readiness} />

      {/* Difficulty ladder */}
      <div className="exam-difficulty-ladder">
        {[
          { range: 'Exams 1–5', label: 'Easy', icon: '⭐', color: '#4ade80', active: nextExamNum <= 5 },
          { range: 'Exams 6–8', label: 'Medium', icon: '⭐⭐', color: '#fbbf24', active: nextExamNum >= 6 && nextExamNum <= 8 },
          { range: 'Exams 9–10', label: 'Hard', icon: '⭐⭐⭐', color: '#f87171', active: nextExamNum >= 9 },
        ].map(d => (
          <div key={d.label} className={`exam-diff-step${d.active ? ' active' : ''}`} style={{ '--diff-color': d.color } as React.CSSProperties}>
            <span className="exam-diff-icon">{d.icon}</span>
            <span className="exam-diff-label">{d.label}</span>
            <span className="exam-diff-range">{d.range}</span>
          </div>
        ))}
      </div>

      {/* Practice Test banner */}
      <div className="exam-practice-banner" onClick={() => onStart('phonics', true)}>
        <div className="exam-practice-icon">🧪</div>
        <div className="exam-practice-body">
          <div className="exam-practice-title">Practice Test — Warm Up First!</div>
          <div className="exam-practice-desc">
            {gradeLabel}-level questions · 15 questions · 10 minutes · Does NOT count toward your grade
          </div>
        </div>
        <button
          className="exam-section-start-btn"
          style={{ background: '#60a5fa', flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); onStart('phonics', true) }}
        >
          Start Practice →
        </button>
      </div>

      {/* Section cards */}
      <div className="exam-sections-grid">
        {REAL_SECTIONS.filter(s => s !== 'mixed').map(sk => {
          const meta = EXAM_SECTIONS[sk]
          const ss   = sectionMap[sk]
          const locked = ss?.retakes_remaining === 0 && !ss?.passed
          return (
            <div
              key={sk}
              className={`exam-section-card${locked ? ' maxed-out' : ''}`}
              style={{ '--section-color': meta.color } as React.CSSProperties}
              onClick={() => !locked && onStart(sk, false)}
            >
              <span className="exam-section-emoji">{meta.emoji}</span>
              <div className="exam-section-name">{meta.label}</div>
              <div className="exam-section-desc">{meta.desc}</div>
              <div className="exam-section-badges">
                {ss ? <RetakeIndicator sec={ss} /> : <span className="exam-section-last-score untaken">Not taken yet</span>}
                {locked ? (
                  <span style={{ color: '#f87171', fontSize: '0.76rem', fontWeight: 700 }}>🔒 Retakes exhausted</span>
                ) : (
                  <button
                    className="exam-section-start-btn"
                    style={{ background: meta.color }}
                    onClick={e => { e.stopPropagation(); onStart(sk, false) }}
                  >
                    {ss?.total_attempts ? 'Retake' : 'Start'} →
                  </button>
                )}
              </div>
            </div>
          )
        })}

        {/* Mixed Assessment */}
        {(() => {
          const meta   = EXAM_SECTIONS['mixed']
          const ss     = sectionMap['mixed']
          const locked = ss?.retakes_remaining === 0 && !ss?.passed
          return (
            <div
              className={`exam-section-card mixed-card${locked ? ' maxed-out' : ''}`}
              style={{ '--section-color': meta.color } as React.CSSProperties}
              onClick={() => !locked && onStart('mixed', false)}
            >
              <span className="exam-section-emoji">{meta.emoji}</span>
              <div style={{ flex: 1 }}>
                <div className="exam-section-name">{meta.label} — Final Readiness Exam</div>
                <div className="exam-section-desc">
                  {meta.desc} — Pass this (plus all other requirements) to unlock your Grade Certificate!
                </div>
                {ss && <RetakeIndicator sec={ss} />}
              </div>
              <div style={{ flexShrink: 0 }}>
                {locked ? (
                  <span style={{ color: '#f87171', fontSize: '0.8rem', fontWeight: 700 }}>🔒 Retakes exhausted</span>
                ) : (
                  <button
                    className="exam-section-start-btn"
                    style={{ background: meta.color }}
                    onClick={e => { e.stopPropagation(); onStart('mixed', false) }}
                  >
                    {ss?.total_attempts ? 'Retake' : 'Start'} →
                  </button>
                )}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Reset zone */}
      {readiness?.any_section_maxed_retakes && (
        <div className="exam-reset-zone">
          <div className="exam-reset-icon">🔄</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#f87171', marginBottom: 4 }}>Progress Reset Required</div>
            <div style={{ fontSize: '0.82rem', color: 'rgba(204,195,216,0.6)', lineHeight: 1.55 }}>
              You've used all retakes on a section without passing. Reset to start over.
              Your XP earned is kept but all attempt records will be cleared.
            </div>
          </div>
          <button className="exam-reset-btn" onClick={onReset}>Reset & Start Over</button>
        </div>
      )}

      {/* History table */}
      <div className="exam-history-section">
        <div className="exam-history-title">📋 Exam History</div>
        <div className="exam-history-table-wrap">
          {loadingHistory ? (
            <div className="exam-history-empty">Loading history…</div>
          ) : history.length === 0 ? (
            <div className="exam-history-empty">No exams taken yet — start with the Practice Test above! 🚀</div>
          ) : (
            <table className="exam-history-table">
              <thead><tr>
                <th>Date</th><th>Section</th><th>Type</th><th>Score</th>
                <th>Correct</th><th>Time</th><th>Result</th><th>XP</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.attempt_id}>
                    <td>{formatDate(item.completed_at)}</td>
                    <td>{EXAM_SECTIONS[item.section]?.emoji ?? '📝'} {item.section_label}</td>
                    <td>
                      {item.is_practice
                        ? <span style={{ color: '#60a5fa', fontSize: '0.76rem', fontWeight: 700 }}>Practice</span>
                        : <span style={{ color: '#c084fc', fontSize: '0.76rem', fontWeight: 700 }}>Exam #{item.exam_number}</span>}
                    </td>
                    <td><strong>{item.score_pct}%</strong></td>
                    <td>{item.correct_count} / {item.total_questions}</td>
                    <td>{item.time_taken_sec ? formatTime(item.time_taken_sec) : '—'}</td>
                    <td>
                      {item.passed
                        ? <span className="exam-result-pass">✓ Pass</span>
                        : <span className="exam-result-fail">✗ Fail</span>}
                    </td>
                    <td>⚡ {item.xp_earned}</td>
                    <td>
                      <button className="exam-table-action-btn" onClick={() => onReview(item)}>Review</button>
                      <button className="exam-table-action-btn" onClick={() => onStart(item.section, item.is_practice)}>Retake</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Generating Screen ─────────────────────────────────────────────────────────

const ENCOURAGING = [
  "You've got this! Every great reader started right here. 🌟",
  "Deep breaths — you've practiced hard for this moment! 💪",
  "Your brain is incredible. Trust what you've learned! 🧠",
  "Champions warm up before they shine. You're one of them! 🏆",
  "Every question is a chance to show how smart you are! ⭐",
  "Mistakes are just stepping stones to greatness. Go for it! 🚀",
  "You're stronger and smarter than you know. Believe it! 🦁",
  "Reading opens every door. You hold the key! 🗝️",
]

function GeneratingScreen({
  isPractice, section, grade, firstName,
}: {
  isPractice: boolean; section: string; grade: number; firstName: string
}) {
  const [msgIdx, setMsgIdx] = useState(0)

  // Pick two distinct indices from the curated reliable list, stable per mount
  const [leftIdx, rightIdx] = useMemo(() => {
    const a = Math.floor(Math.random() * RELIABLE_CHARS.length)
    let b = Math.floor(Math.random() * RELIABLE_CHARS.length)
    if (b === a) b = (a + 1) % RELIABLE_CHARS.length
    return [a, b]
  }, [])

  // If an image 404s, cycle to the next character automatically
  const [leftFallback,  setLeftFallback]  = useState(leftIdx)
  const [rightFallback, setRightFallback] = useState(rightIdx)

  const leftChar  = RELIABLE_CHARS[leftFallback]
  const rightChar = RELIABLE_CHARS[rightFallback]

  useEffect(() => {
    const t = setInterval(() => setMsgIdx(i => (i + 1) % ENCOURAGING.length), 3200)
    return () => clearInterval(t)
  }, [])

  const gradeLabel   = ['Kindergarten','1st Grade','2nd Grade','3rd Grade','4th Grade','5th Grade','6th Grade','7th Grade','8th Grade'][grade] ?? 'your grade'
  const sectionLabel = EXAM_SECTIONS[section]?.label ?? ''

  return (
    <div className="exam-generating exam-generating-stage">
      {/* Left character — transparent PNG from curated list */}
      <div className="exam-gen-char exam-gen-char-left">
        <div className="exam-gen-char-ring" />
        <img
          key={leftFallback}
          src={leftChar.img}
          alt={leftChar.name}
          className="exam-gen-char-img"
          onError={() => setLeftFallback(i => (i + 1) % RELIABLE_CHARS.length)}
        />
        <div className="exam-gen-char-name">{leftChar.name}</div>
      </div>

      {/* Center content */}
      <div className="exam-generating-center">
        <div className="exam-generating-glow" />
        <div className="exam-generating-spinner" />
        <div className="exam-generating-title">
          {isPractice ? '🧪 Building Practice Test…' : '✨ Generating Your Exam…'}
        </div>
        <div className="exam-generating-sub">
          {isPractice
            ? `Creating 15 warm-up questions for ${gradeLabel}, ${firstName}. About 10–15 seconds.`
            : `Building 30 ${sectionLabel} questions at ${gradeLabel} level. About 15–30 seconds.`}
        </div>
        <div className="exam-gen-encourage" key={msgIdx}>
          {ENCOURAGING[msgIdx]}
        </div>
        <div className="exam-generating-dots"><span /><span /><span /></div>
      </div>

      {/* Right character — transparent PNG from curated list */}
      <div className="exam-gen-char exam-gen-char-right">
        <div className="exam-gen-char-ring" />
        <img
          key={rightFallback}
          src={rightChar.img}
          alt={rightChar.name}
          className="exam-gen-char-img"
          onError={() => setRightFallback(i => (i + 1) % RELIABLE_CHARS.length)}
        />
        <div className="exam-gen-char-name">{rightChar.name}</div>
      </div>
    </div>
  )
}

// ── Exam Test View ────────────────────────────────────────────────────────────

function ExamTestView({
  exam, onSubmit, submitting, onExit, externalError,
}: {
  exam: ReadingExam
  onSubmit: (answers: Record<string, string[]>, timeTaken: number, startedAt: string) => void
  submitting: boolean
  onExit: () => void
  externalError?: string | null
}) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string[]>>({})
  const [timeLeft, setTimeLeft] = useState(exam.time_limit_sec)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const startedAt    = useRef(new Date().toISOString())
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const answersRef   = useRef(answers)
  answersRef.current = answers

  // Hide the global XP badge while taking an exam — it overlaps the countdown timer
  useEffect(() => {
    document.body.classList.add('exam-active')
    return () => document.body.classList.remove('exam-active')
  }, [])

  const question: ExamQuestion = exam.questions[current]
  const totalQ = exam.questions.length

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          onSubmit(answersRef.current, exam.time_limit_sec, startedAt.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, []) // eslint-disable-line

  const toggleAnswer = useCallback((qId: string, letter: string, isMulti: boolean) => {
    setAnswers(prev => {
      const cur = prev[qId] ?? []
      if (isMulti) return { ...prev, [qId]: cur.includes(letter) ? cur.filter(l => l !== letter) : [...cur, letter] }
      return { ...prev, [qId]: [letter] }
    })
  }, [])

  const handleSubmit = () => {
    setSubmitError(null)
    clearInterval(timerRef.current!)
    onSubmit(answers, exam.time_limit_sec - timeLeft, startedAt.current)
  }

  const handleExit = () => setShowExitModal(true)

  const confirmExit = () => {
    clearInterval(timerRef.current!)
    setShowExitModal(false)
    onExit()
  }

  const answeredCount   = Object.keys(answers).length
  const unansweredCount = totalQ - answeredCount
  const timerClass      = getTimerClass(timeLeft, exam.time_limit_sec)
  const sectionMeta     = EXAM_SECTIONS[exam.section] ?? EXAM_SECTIONS['phonics']
  const selectedLetters = answers[question.id] ?? []
  const getLetter = (c: string) => c.charAt(0).toUpperCase()

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60

  return (
    <div className="exam-test-root">

      {/* ── Exit Confirmation Modal ── */}
      {showExitModal && (
        <div className="exam-exit-modal-overlay" onClick={() => setShowExitModal(false)}>
          <div className="exam-exit-modal" onClick={e => e.stopPropagation()}>
            <div className="exam-exit-modal-icon">⚠️</div>
            <div className="exam-exit-modal-title">Exit Exam?</div>
            <div className="exam-exit-modal-body">
              Your progress will be <strong>lost</strong> and this attempt will not be scored.
              {Object.keys(answers).length > 0 && (
                <div className="exam-exit-modal-stat">
                  You've answered <strong>{Object.keys(answers).length}</strong> of <strong>{totalQ}</strong> questions.
                </div>
              )}
            </div>
            <div className="exam-exit-modal-actions">
              <button className="exam-exit-modal-cancel" onClick={() => setShowExitModal(false)}>
                Keep Going
              </button>
              <button className="exam-exit-modal-confirm" onClick={confirmExit}>
                Yes, Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exit nav bar with big timer ── */}
      <div className="exam-test-exit-nav">
        <button className="exam-test-exit-btn" onClick={handleExit}>
          ← Exit Exam
        </button>
        <div className="exam-test-exit-info">
          {exam.is_practice ? '🧪 Practice Test' : `${sectionMeta.emoji} ${sectionMeta.label}`}
          <span className="exam-test-exit-grade">
            {GRADE_LABELS[exam.grade_level]} ·&nbsp;
            {exam.exam_difficulty === 'easy' ? '⭐ Easy' : exam.exam_difficulty === 'medium' ? '⭐⭐ Medium' : '⭐⭐⭐ Hard'}
          </span>
        </div>
        <div className={`exam-test-timer-big ${timerClass}`}>
          <span className="exam-timer-digit">{String(mins).padStart(2, '0')}</span>
          <span className="exam-timer-sep">:</span>
          <span className="exam-timer-digit">{String(secs).padStart(2, '0')}</span>
          <span className="exam-timer-label">left</span>
        </div>
      </div>

      {/* Inline submission error — no browser alert, answers are safe */}
      {(submitError || externalError) && (
        <div className="exam-submit-error-banner">
          ⚠️ {externalError ?? submitError} — your answers are safe, please try again.
          <button onClick={() => setSubmitError(null)} style={{ marginLeft: 12, background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Secondary info bar — question count only, timer is in the exit nav */}
      <div className="exam-test-header">
        <div className="exam-test-section-label">
          Question {current + 1} of {totalQ}
        </div>
        <div className="exam-test-counter">{answeredCount} answered · {unansweredCount} remaining</div>
      </div>

      <div className="exam-progress-track">
        <div className="exam-progress-fill" style={{ width: `${((current + 1) / totalQ) * 100}%` }} />
      </div>

      <div className="exam-test-body">
        <div className="exam-question-card">
          <div className="exam-q-meta">
            <span className="exam-q-num">#{question.question_number}</span>
            <span className="exam-q-strand">{question.strand}</span>
            {question.question_type === 'multi' && <span className="exam-q-type-badge">Multi-select</span>}
            <span className={`exam-q-difficulty ${question.difficulty}`}>{question.difficulty}</span>
          </div>

          {question.passage && <div className="exam-passage">{question.passage}</div>}
          <div className="exam-q-text">{question.question_text}</div>
          {question.question_type === 'multi' && <div className="exam-q-multi-hint">⚠️ Select ALL correct answers</div>}

          <div className="exam-choices">
            {question.choices.map(choice => {
              const letter = getLetter(choice)
              const sel = selectedLetters.includes(letter)
              return (
                <button
                  key={letter}
                  className={`exam-choice${sel ? ' selected' : ''}`}
                  onClick={() => toggleAnswer(question.id, letter, question.question_type === 'multi')}
                >
                  <span className="exam-choice-letter">{letter}</span>
                  <span className="exam-choice-text">{choice.slice(2).trim()}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="exam-test-nav">
          <button className="exam-nav-prev" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>← Prev</button>
          <div className="exam-q-dot-track">
            {exam.questions.map((q, i) => (
              <div
                key={q.id}
                className={`exam-q-dot${answers[q.id] ? ' answered' : ''}${i === current ? ' current' : ''}`}
                title={`Q${i + 1}${answers[q.id] ? ' ✓' : ''}`}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
          <button className="exam-nav-next" disabled={current === totalQ - 1} onClick={() => setCurrent(c => c + 1)}>Next →</button>
        </div>

        <button
          className="exam-submit-btn"
          onClick={handleSubmit}
          disabled={submitting || timeLeft === 0}
        >
          {submitting ? '⏳ Grading your exam…' : `Submit ${exam.is_practice ? 'Practice' : 'Exam'} (${answeredCount}/${totalQ} answered)`}
        </button>
        {unansweredCount > 0 && (
          <div className="exam-answers-left">⚠️ {unansweredCount} question{unansweredCount > 1 ? 's' : ''} unanswered</div>
        )}
      </div>
    </div>
  )
}

// ── Results View ─────────────────────────────────────────────────────────────

function ResultsView({
  result, onRetake, onBackToHub,
}: {
  result: ExamResult
  onRetake: () => void
  onBackToHub: () => void
}) {
  const [showReview, setShowReview] = useState(false)
  const sectionMeta = EXAM_SECTIONS[result.section] ?? EXAM_SECTIONS['phonics']

  const strandMap: Record<string, { correct: number; total: number }> = {}
  result.results.forEach(q => {
    if (!strandMap[q.strand]) strandMap[q.strand] = { correct: 0, total: 0 }
    strandMap[q.strand].total++
    if (q.is_correct) strandMap[q.strand].correct++
  })

  const circumference = 2 * Math.PI * 58
  const dashOffset    = circumference - (result.score_pct / 100) * circumference
  const scoreColor    = result.passed ? '#4ade80' : '#f87171'

  return (
    <div className="exam-results-root">
      <div className="exam-results-hero">
        <span className="exam-results-icon">{result.passed ? '🏆' : result.is_practice ? '🧪' : '💪'}</span>
        <h1 className={`exam-results-headline ${result.passed ? 'passed' : 'failed'}`}>
          {result.is_practice
            ? (result.passed ? 'Great Warmup! Ready for the real exam?' : 'Good Practice! Keep at it!')
            : (result.passed ? 'Excellent Work!' : 'Keep Practicing!')}
        </h1>
        <div className="exam-results-sub">
          {result.is_practice ? '🧪 Practice Test' : `${sectionMeta.emoji} ${sectionMeta.label}`}
          {!result.is_practice && ` · Exam #${result.exam_number}`}
        </div>

        <div className="exam-score-meter">
          <div className="exam-score-circle">
            <svg width="164" height="164" viewBox="0 0 164 164">
              <circle cx="82" cy="82" r="58" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="12"/>
              <circle
                cx="82" cy="82" r="58" fill="none"
                stroke={scoreColor} strokeWidth="12" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 1.1s ease' }}
              />
            </svg>
            <div className="exam-score-circle-text">
              <span className="exam-score-pct">{result.score_pct}%</span>
              <span className="exam-score-label">{result.passed ? 'PASS ✓' : 'FAIL ✗'}</span>
            </div>
          </div>
          <div className="exam-score-stats">
            <div className="exam-score-stat"><strong>{result.correct_count}</strong>Correct</div>
            <div className="exam-score-stat"><strong>{result.total_questions - result.correct_count}</strong>Wrong</div>
            {result.time_taken_sec && <div className="exam-score-stat"><strong>{formatTime(result.time_taken_sec)}</strong>Time</div>}
          </div>
        </div>

        {!result.is_practice && (
          <div className="exam-xp-earned" style={result.reset_triggered ? { background: 'rgba(248,113,113,0.1)', borderColor: 'rgba(248,113,113,0.3)' } : {}}>
            {result.reset_triggered ? (
              <>
                <div className="exam-xp-earned-icon">🔄</div>
                <div className="exam-xp-earned-text" style={{ color: '#f87171' }}>
                  All retakes used — <strong>your progress has been reset.</strong> You'll start fresh.
                </div>
              </>
            ) : !result.passed ? (
              <>
                <div className="exam-xp-earned-icon">🔁</div>
                <div className="exam-xp-earned-text">
                  <span style={{ color: '#fbbf24' }}>{result.retakes_remaining} retake{result.retakes_remaining !== 1 ? 's' : ''} remaining</span>
                  {result.retakes_remaining === 0 && ' — reset required if you fail again'}
                </div>
              </>
            ) : (
              <>
                <div className="exam-xp-earned-icon">⚡</div>
                <div className="exam-xp-earned-text">
                  You earned <span className="exam-xp-earned-amt">+{result.xp_earned} XP</span>
                  {result.score_pct >= 90 && ' 🎉 Perfect Score Bonus!'}
                </div>
              </>
            )}
          </div>
        )}

        {result.is_practice && (
          <div className="exam-xp-earned">
            <div className="exam-xp-earned-icon">⚡</div>
            <div className="exam-xp-earned-text">+{result.xp_earned} XP for completing practice!</div>
          </div>
        )}
      </div>

      <div className="exam-strand-breakdown">
        <div className="exam-strand-title">📊 Performance by Strand</div>
        {Object.entries(strandMap).map(([strand, { correct, total }]) => {
          const pct = total > 0 ? Math.round((correct / total) * 100) : 0
          return (
            <div key={strand} className="exam-strand-row">
              <div className="exam-strand-name">{EXAM_SECTIONS[strand]?.emoji ?? '📝'} {strand.charAt(0).toUpperCase() + strand.slice(1)}</div>
              <div className="exam-strand-bar-wrap">
                <div className="exam-strand-bar-fill" style={{ width: `${pct}%`, background: getStrandColor(strand) }} />
              </div>
              <div className="exam-strand-pct">{pct}%</div>
            </div>
          )
        })}
      </div>

      <div className="exam-review-toggle">
        <button className="exam-review-btn" onClick={onBackToHub}>← Back to Hub</button>
        {!result.reset_triggered && <button className="exam-review-btn" onClick={onRetake}>🔄 Retake</button>}
        <button className="exam-review-btn primary" onClick={() => setShowReview(v => !v)}>
          {showReview ? 'Hide Review' : '🔍 Review Answers'}
        </button>
      </div>

      {showReview && (
        <div className="exam-review-list">
          {result.results.map(q => {
            const sL = q.student_answers.map(l => l.toUpperCase())
            const cL = q.correct_answers.map(l => l.toUpperCase())
            return (
              <div key={q.question_id} className={`exam-review-item ${q.is_correct ? 'correct' : 'wrong'}`}>
                <div className="exam-review-q-header">
                  <span className="exam-review-q-num">Q{q.question_number}</span>
                  <span className="exam-review-icon">{q.is_correct ? '✅' : '❌'}</span>
                  <span className="exam-q-strand">{q.strand}</span>
                </div>
                {q.passage && <div className="exam-review-passage">{q.passage}</div>}
                <div className="exam-review-q-text">{q.question_text}</div>
                <div className="exam-review-choices">
                  {q.choices.map(choice => {
                    const l = choice.charAt(0).toUpperCase()
                    const isStu = sL.includes(l), isCor = cL.includes(l)
                    const cls = (isStu && isCor) ? 'both' : isStu ? 'student-ans' : isCor ? 'correct-ans' : ''
                    return <div key={l} className={`exam-review-choice ${cls}`}>{isCor ? '✓' : isStu ? '✗' : '  '} {choice}</div>
                  })}
                </div>
                {q.explanation && <div className="exam-review-explanation">💡 {q.explanation}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ReadingExams() {
  const navigate = useNavigate()
  const location = useLocation()
  const [view, setView] = useState<View>('hub')
  const [exam, setExam] = useState<ReadingExam | null>(null)
  const [result, setResult] = useState<ExamResult | null>(null)
  const [history, setHistory] = useState<ExamHistoryItem[]>([])
  const [readiness, setReadiness] = useState<GradeReadiness | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitErrorMsg, setSubmitErrorMsg] = useState<string | null>(null)
  const [generatingSection, setGeneratingSection] = useState('')
  const [generatingPractice, setGeneratingPractice] = useState(false)

  // ── Active student state ───────────────────────────────────────────────────
  const [studentId,    setStudentId]    = useState(() => localStorage.getItem('readquest_student_id')    ?? 'guest')
  const [studentName,  setStudentName]  = useState(() => localStorage.getItem('readquest_student_name')  ?? '')
  const [studentGrade, setStudentGrade] = useState(() => parseInt(localStorage.getItem('readquest_student_grade') ?? '1', 10) || 1)

  // ── Children list for switcher ────────────────────────────────────────────
  const [children,  setChildren]  = useState<Child[]>([])

  const { speaking, play: playTutorial } = useTutorialVoice(studentId, studentName)
  const studentFirstName = firstNameOnly(studentName)
  const tutorialFiredRef = useRef(false)  // prevents double-fire on strict-mode double mount

  // ── Fetch children from Supabase session ─────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) return
      fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: Child[]) => setChildren(Array.isArray(data) ? data : []))
        .catch(() => {})
    })
  }, [])

  // ── Switch student ────────────────────────────────────────────────────────
  const switchStudent = useCallback((child: Child) => {
    localStorage.setItem('readquest_student_id',    child.id)
    localStorage.setItem('readquest_student_name',  child.name)
    localStorage.setItem('readquest_student_grade', String(child.grade_level ?? 1))
    setStudentId(child.id)
    setStudentName(child.name)
    setStudentGrade(child.grade_level ?? 1)
    setView('hub')
    setExam(null)
    setResult(null)
    setLoadingHistory(true)
    // Pre-cache tutorial for this student
    preloadSpellingWelcome(child.id, child.name)
    preloadExamTutorial(child.id, child.name)
  }, [])

  // ── Load data for current student ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    setLoadingHistory(true)
    // Use /scores (not /history) so practice test results are ALWAYS included
    Promise.all([examsApi.scores(true), examsApi.readiness()])
      .then(([h, r]) => { if (!mounted) return; setHistory(h.data ?? []); setReadiness(r.data ?? null) })
      .catch(console.error)
      .finally(() => { if (mounted) setLoadingHistory(false) })
    return () => { mounted = false }
  }, [studentId])  // re-run when student switches

  // ── Auto-scroll to scores table when arriving via /scores route ─────────────
  useEffect(() => {
    if (location.pathname === '/scores' && !loadingHistory) {
      setTimeout(() => {
        document.querySelector('.exam-history-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 300)
    }
  }, [location.pathname, loadingHistory])

  // Identical pattern to SpellingArena: useRef guard, cache-first, live fallback.
  // If Dashboard pre-cached the audio, it plays INSTANTLY with zero network delay.
  useEffect(() => {
    if (tutorialFiredRef.current || !studentId) return
    tutorialFiredRef.current = true
    const cancel = autoPlayExamTutorial(studentId, studentFirstName)
    return cancel  // cancel pending fetch if component unmounts before audio is ready
  }, [studentId, studentFirstName])  // re-fires only when student switches

  const refreshHistory = useCallback(async () => {
    try {
      const [h, r] = await Promise.all([examsApi.scores(true), examsApi.readiness()])
      setHistory(h.data ?? []); setReadiness(r.data ?? null)
    } catch { /* ignore */ }
  }, [])

  const handleStartExam = async (section: string, isPractice: boolean) => {
    setGeneratingSection(section)
    setGeneratingPractice(isPractice)
    setView('generating')
    try {
      const res = await examsApi.generate(studentGrade, section, isPractice)
      setExam(res.data)
      setView('testing')
    } catch (e: any) {
      alert(`Could not generate exam: ${e?.response?.data?.detail ?? e.message}`)
      setView('hub')
    }
  }

  const handleSubmitExam = async (
    answers: Record<string, string[]>,
    timeTaken: number,
    startedAt: string,
  ) => {
    if (!exam) return
    setSubmitting(true)
    setSubmitErrorMsg(null)
    try {
      const res = await examsApi.submit(exam.exam_id, answers, timeTaken, startedAt, exam.is_practice)
      setResult(res.data)
      setView('results')
      refreshHistory()
    } catch (e: any) {
      // Show inline error — keep student in test view so answers aren't lost
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Network error'
      setSubmitErrorMsg(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleReviewFromHistory = async (item: ExamHistoryItem) => {
    try {
      const res = await examsApi.review(item.attempt_id)
      setResult(res.data); setView('results')
    } catch (e: any) {
      alert(`Could not load review: ${e?.response?.data?.detail ?? e.message}`)
    }
  }

  const handleReset = async () => {
    if (!confirm('Reset all exam progress for this grade? Your XP is kept but all attempts will be cleared.')) return
    try {
      await examsApi.resetProgress(studentGrade)
      await refreshHistory()
    } catch (e: any) {
      alert(`Reset failed: ${e?.response?.data?.detail ?? e.message}`)
    }
  }

  const handleRetake    = () => { if (result) handleStartExam(result.section, result.is_practice) }
  const handleBackToHub = () => { setView('hub'); setExam(null); setResult(null) }

  if (view === 'testing' && exam) {
    return (
      <ExamTestView
        exam={exam}
        onSubmit={handleSubmitExam}
        submitting={submitting}
        onExit={handleBackToHub}
        externalError={submitErrorMsg}
      />
    )
  }

  return (
    <div className="exam-root">
      {/* ── Navigation ── */}
      <nav className="exam-nav">
        <button className="exam-nav-back" onClick={() => navigate('/dashboard')}>← Dashboard</button>
        <div className="exam-nav-logo">ReadQuest ✨</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Scores quick link */}
          <button
            className={`exam-nav-tab${location.pathname === '/scores' ? ' active' : ''}`}
            onClick={() => navigate('/scores')}
            title="View all exam scores"
          >
            📊 Scores
          </button>
          {/* Student switcher */}
          {children.length > 0 && (
            <StudentDropdown
              children={children}
              selected={children.find(c => c.id === studentId) ?? null}
              onChange={(child) => child && switchStudent(child)}
              allowAll={false}
            />
          )}
          {/* Voice tutorial */}
          <button className="exam-voice-tutorial-btn" onClick={playTutorial} title={speaking ? 'Stop' : 'Hear how this works'}>
            {speaking ? <><div className="exam-voice-dot" /> Stop</> : <><span className="btn-icon">🔊</span> How to use</>}
          </button>
        </div>
      </nav>

      {/* ── Generating ── */}
      {view === 'generating' && (
        <GeneratingScreen
          isPractice={generatingPractice}
          section={generatingSection}
          grade={studentGrade}
          firstName={studentFirstName}
        />
      )}

      {/* ── Results ── */}
      {view === 'results' && result && (
        <ResultsView result={result} onRetake={handleRetake} onBackToHub={handleBackToHub} />
      )}

      {/* ── Hub ── */}
      {view === 'hub' && (
        <HubView
          history={history}
          readiness={readiness}
          studentGrade={studentGrade}
          studentFirstName={studentFirstName}
          onStart={handleStartExam}
          onReview={handleReviewFromHistory}
          onReset={handleReset}
          loadingHistory={loadingHistory}
        />
      )}
    </div>
  )
}
