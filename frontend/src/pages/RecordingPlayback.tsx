import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getRecording, downloadRecording } from '../services/recordingsDb'
import type { Recording, WordStatus } from '../types'
import '../styles/recordings.css'

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Returns which word index should be active given current playback time */
function getActiveWordIdx(currentTime: number, duration: number, wordCount: number): number {
  if (duration <= 0 || wordCount === 0) return -1
  return Math.min(Math.floor((currentTime / duration) * wordCount), wordCount - 1)
}

export default function RecordingPlayback() {
  const { bookId, recordingId } = useParams<{ bookId: string; recordingId: string }>()
  const navigate = useNavigate()

  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [activeWordIdx, setActiveWordIdx] = useState(-1)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  // Load recording from IndexedDB
  useEffect(() => {
    if (!recordingId) return
    getRecording(Number(recordingId))
      .then(rec => {
        if (!rec) { setError('Recording not found.'); return }
        setRecording(rec)
        setDuration(rec.duration)
        // Create object URL from blob
        const url = URL.createObjectURL(rec.audioBlob)
        audioUrlRef.current = url
        const audio = new Audio(url)
        audio.preload = 'metadata'
        audio.onloadedmetadata = () => {
          setDuration(audio.duration || rec.duration)
        }
        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime)
          const wordCount = rec.pageText.split(/\s+/).filter(Boolean).length
          setActiveWordIdx(getActiveWordIdx(audio.currentTime, audio.duration || rec.duration, wordCount))
        }
        audio.onended = () => { setIsPlaying(false); setActiveWordIdx(-1) }
        audioRef.current = audio
      })
      .catch(() => setError('Failed to load recording.'))
      .finally(() => setLoading(false))

    return () => {
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [recordingId])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [isPlaying])

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = Number(e.target.value)
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  if (loading) return (
    <div className="rec-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="rec-loading">
        <div className="rec-loading-spinner" />
        <span>Loading recording…</span>
      </div>
    </div>
  )

  if (error || !recording) return (
    <div className="rec-root" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="rec-loading">
        <div style={{ fontSize: '3rem' }}>😔</div>
        <p style={{ color: '#f87171' }}>{error || 'Recording not found.'}</p>
        <button className="rec-back-btn" onClick={() => navigate(`/recordings/${bookId}`)}>
          ← Back to Book
        </button>
      </div>
    </div>
  )

  const pageWords = recording.pageText.split(/\s+/).filter(Boolean)
  const accuracyCls = recording.accuracy >= 80 ? 'accuracy-high' : recording.accuracy >= 60 ? 'accuracy-mid' : 'accuracy-low'
  const coverUrl = recording.bookCover
    ? (recording.bookCover.startsWith('/static')
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}${recording.bookCover}`
        : recording.bookCover)
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
          <button className="rec-nav-link" onClick={() => navigate('/library')} id="nav-library">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            <span>Library</span>
          </button>
          <button className="rec-nav-link active" onClick={() => navigate('/recordings')} id="nav-recordings">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            <span>Recordings</span>
          </button>
        </nav>
      </aside>

      {/* Playback Area */}
      <main className="pb-root">
        <button className="rec-back-btn" onClick={() => navigate(`/recordings/${bookId}`)} id="btn-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 14, height: 14 }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {recording.bookTitle}
        </button>

        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="rec-page-title" style={{ fontSize: '1.4rem', marginBottom: 8 }}>
            {coverUrl ? (
              <img src={coverUrl} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', verticalAlign: 'middle', marginRight: 10 }} />
            ) : '📚 '}
            Page {recording.pageNumber} — {recording.bookTitle}
          </div>
          {/* Meta chips */}
          <div className="pb-meta-bar">
            <span className={`pb-meta-chip ${accuracyCls}`}>
              {recording.accuracy >= 80 ? '⭐' : recording.accuracy >= 60 ? '📈' : '💪'} {recording.accuracy}% accuracy
            </span>
            <span className="pb-meta-chip">⏱ {formatDuration(recording.duration)}</span>
            <span className="pb-meta-chip">📅 {new Date(recording.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            <button
              className="pb-meta-chip"
              style={{ cursor: 'pointer', background: 'rgba(155,94,255,0.1)', border: '1px solid rgba(155,94,255,0.2)' }}
              onClick={() => downloadRecording(recording)}
              id="btn-download"
            >
              ⬇ Download
            </button>
          </div>
        </motion.div>

        {/* Audio Player */}
        <motion.div
          className="pb-player"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <button className="pb-play-pause" onClick={togglePlay} id="btn-play-pause" aria-label={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="play-icon">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="pb-progress-wrap">
            <div className="pb-book-label">
              {recording.studentName} · Page {recording.pageNumber}
            </div>
            <div className="pb-seek-row">
              <input
                className="pb-seek"
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                id="seek-bar"
                style={{
                  background: `linear-gradient(to right, #9b5eff ${(currentTime / (duration || 1)) * 100}%, rgba(155,94,255,0.2) 0%)`,
                }}
              />
              <span className="pb-time">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Karaoke Text */}
        <motion.div
          className="pb-karaoke-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="pb-karaoke-label">📖 Follow Along</div>
          <div className="pb-karaoke-text">
            {pageWords.map((word, i) => {
              const status: WordStatus = recording.wordStatuses[i] ?? 'idle'
              const isActive = i === activeWordIdx
              const cls = isActive
                ? 'pb-word status-active'
                : status === 'correct'
                ? 'pb-word status-correct'
                : status === 'wrong'
                ? 'pb-word status-wrong'
                : 'pb-word status-idle'
              return (
                <span key={i} className={cls} id={`pb-word-${i}`}>
                  {word}{' '}
                </span>
              )
            })}
          </div>
        </motion.div>

        {/* Transcript */}
        {recording.transcript && (
          <motion.div
            className="pb-transcript-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="pb-transcript-label">🗒 What was said</div>
            <div className="pb-transcript-text">"{recording.transcript}"</div>
          </motion.div>
        )}
      </main>
    </div>
  )
}
