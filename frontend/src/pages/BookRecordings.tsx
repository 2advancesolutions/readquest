import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getRecordingsByBook, deleteRecording, downloadRecording } from '../services/recordingsDb'
import type { Recording } from '../types'
import '../styles/recordings.css'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AccuracyPill({ accuracy }: { accuracy: number }) {
  const cls = accuracy >= 80 ? 'high' : accuracy >= 60 ? 'mid' : 'low'
  return (
    <span className={`rec-accuracy-pill ${cls}`}>
      {accuracy >= 80 ? '⭐' : accuracy >= 60 ? '📈' : '💪'} {accuracy}%
    </span>
  )
}

export default function BookRecordings() {
  const { bookId } = useParams<{ bookId: string }>()
  const navigate = useNavigate()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) return
    const studentId = localStorage.getItem('readquest_student_id') || 'guest'
    getRecordingsByBook(studentId, bookId)
      .then(setRecordings)
      .catch(() => setRecordings([]))
      .finally(() => setLoading(false))
  }, [bookId])

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('Delete this recording? This cannot be undone.')) return
    await deleteRecording(id)
    setRecordings(prev => prev.filter(r => r.id !== id))
  }

  const handleDownload = (e: React.MouseEvent, rec: Recording) => {
    e.stopPropagation()
    downloadRecording(rec)
  }

  const book = recordings[0]
  const avgAccuracy = recordings.length
    ? Math.round(recordings.reduce((a, r) => a + r.accuracy, 0) / recordings.length)
    : 0
  const coverUrl = book?.bookCover
    ? (book.bookCover.startsWith('/static')
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${book.bookCover}`
        : book.bookCover)
    : null

  return (
    <div className="rec-root">
      {/* Stars */}
      <div className="rec-stars" aria-hidden>
        {[...Array(20)].map((_, i) => (
          <div key={i} className="rec-star" style={{
            left: `${(i * 19 + 5) % 97}%`,
            top: `${(i * 31 + 7) % 93}%`,
            animationDelay: `${(i * 0.41) % 3}s`,
            width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
          }} />
        ))}
      </div>

      {/* Sidebar */}
      <aside className="rec-sidebar">
        <div>
          <div className="rec-logo">ReadQuest</div>
          <div className="rec-logo-sub">The Weightless Archive</div>
        </div>
        <nav className="rec-nav">
          <button className="rec-nav-link" onClick={() => navigate('/dashboard')} id="nav-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Home</span>
          </button>
          <button className="rec-nav-link" onClick={() => navigate('/shelf')} id="nav-library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span>Library</span>
          </button>
          <button className="rec-nav-link" onClick={() => navigate('/rewards')} id="nav-rewards">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            <span>Rewards</span>
          </button>
          <button className="rec-nav-link active" onClick={() => navigate('/recordings')} id="nav-recordings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <span>Recordings</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="rec-main">
        <button className="rec-back-btn" onClick={() => navigate('/recordings')} id="btn-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 14, height: 14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          All Recordings
        </button>

        {loading ? (
          <div className="rec-loading">
            <div className="rec-loading-spinner" />
            <span>Loading recordings…</span>
          </div>
        ) : (
          <>
            {/* Book header */}
            {book && (
              <motion.div
                className="rec-book-header"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="rec-book-cover-large">
                  {coverUrl ? (
                    <img src={coverUrl} alt={book.bookTitle}
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  ) : '📚'}
                </div>
                <div className="rec-book-header-info">
                  <div className="rec-book-header-title">{book.bookTitle}</div>
                  <div className="rec-book-header-meta">Grade {book.gradeLevel} · {recordings.length} recording{recordings.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="rec-book-header-stats">
                  <div className="rec-book-stat">
                    <span className="rec-book-stat-val">{recordings.length}</span>
                    <span className="rec-book-stat-lbl">Sessions</span>
                  </div>
                  <div className="rec-book-stat">
                    <span className="rec-book-stat-val">{avgAccuracy}%</span>
                    <span className="rec-book-stat-lbl">Avg Accuracy</span>
                  </div>
                </div>
              </motion.div>
            )}

            {recordings.length === 0 ? (
              <div className="rec-empty">
                <div className="rec-empty-icon">🎤</div>
                <p>No recordings found for this book yet.</p>
              </div>
            ) : (
              <div className="rec-list">
                <AnimatePresence>
                  {recordings.map((rec, i) => (
                    <motion.div
                      key={rec.id}
                      className="rec-card"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => navigate(`/recordings/${bookId}/${rec.id}`)}
                      id={`rec-card-${rec.id}`}
                    >
                      <div className="rec-card-icon">🎧</div>
                      <div className="rec-card-info">
                        <div className="rec-card-title">Page {rec.pageNumber}</div>
                        <div className="rec-card-meta">
                          <span>{formatDate(rec.createdAt)}</span>
                          <span className="rec-card-meta-dot">·</span>
                          <span>{formatTime(rec.createdAt)}</span>
                          <span className="rec-card-meta-dot">·</span>
                          <span>{formatDuration(rec.duration)}</span>
                          <span className="rec-card-meta-dot">·</span>
                          <AccuracyPill accuracy={rec.accuracy} />
                        </div>
                      </div>
                      <div className="rec-card-actions" onClick={e => e.stopPropagation()}>
                        <button
                          className="rec-download-btn"
                          title="Download recording"
                          onClick={e => handleDownload(e, rec)}
                          id={`btn-download-${rec.id}`}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          className="rec-delete-btn"
                          title="Delete recording"
                          onClick={e => handleDelete(e, rec.id!)}
                          id={`btn-delete-${rec.id}`}
                        >✕</button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
