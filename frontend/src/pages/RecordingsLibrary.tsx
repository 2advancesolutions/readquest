import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getAllBooks } from '../services/recordingsDb'
import type { BookSummary } from '../services/recordingsDb'
import '../styles/recordings.css'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function AccuracyPill({ accuracy }: { accuracy: number }) {
  const cls = accuracy >= 80 ? 'high' : accuracy >= 60 ? 'mid' : 'low'
  return (
    <span className={`rec-accuracy-pill ${cls}`}>
      {accuracy >= 80 ? '⭐' : accuracy >= 60 ? '📈' : '💪'} {accuracy}%
    </span>
  )
}

export default function RecordingsLibrary() {
  const navigate = useNavigate()
  const [books, setBooks] = useState<BookSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const studentId = localStorage.getItem('readquest_student_id') || 'guest'
    getAllBooks(studentId)
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  const navTo = (path: string) => navigate(path)

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
          <button className="rec-nav-link" onClick={() => navTo('/dashboard')} id="nav-home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span>Home</span>
          </button>
          <button className="rec-nav-link" onClick={() => navTo('/library')} id="nav-library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span>Library</span>
          </button>
          <button className="rec-nav-link" onClick={() => navTo('/rewards')} id="nav-rewards">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
            <span>Rewards</span>
          </button>
          <button className="rec-nav-link active" id="nav-recordings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <span>Recordings</span>
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main className="rec-main">
        <div className="rec-page-header">
          <h1 className="rec-page-title">🎙️ Reading Recordings</h1>
          <p className="rec-page-sub">Listen to your child read — every session saved automatically</p>
        </div>

        {loading ? (
          <div className="rec-loading">
            <div className="rec-loading-spinner" />
            <span>Loading recordings…</span>
          </div>
        ) : books.length === 0 ? (
          <AnimatePresence>
            <motion.div className="rec-empty" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="rec-empty-icon">📖</div>
              <p>No recordings yet — have your child read a story and come back!</p>
              <button className="rec-empty-btn" onClick={() => navigate('/generate')}>
                Generate a Story ✨
              </button>
            </motion.div>
          </AnimatePresence>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rec-table-wrap"
          >
            <table className="rec-table">
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Grade</th>
                  <th>Recordings</th>
                  <th>Last Recorded</th>
                  <th>Avg Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book, i) => (
                  <motion.tr
                    key={book.bookId}
                    onClick={() => navigate(`/recordings/${book.bookId}`)}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    id={`rec-book-row-${book.bookId}`}
                  >
                    <td>
                      <div className="rec-book-cell">
                        <div className="rec-book-cover-thumb">
                          {book.bookCover ? (
                            <img
                              src={book.bookCover.startsWith('/static')
                                ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${book.bookCover}`
                                : book.bookCover}
                              alt={book.bookTitle}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                            />
                          ) : '📚'}
                        </div>
                        <div>
                          <div className="rec-book-title">{book.bookTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'rgba(232,224,248,0.55)' }}>Grade {book.gradeLevel}</td>
                    <td><span className="rec-count-badge">{book.recordingCount}</span></td>
                    <td style={{ color: 'rgba(232,224,248,0.55)', fontSize: '0.82rem' }}>{formatDate(book.lastRecordedAt)}</td>
                    <td><AccuracyPill accuracy={book.avgAccuracy} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </main>
    </div>
  )
}
