/**
 * MovieStudio — AI-powered animated story creator for kids.
 * Night-Bloom / Hollywood theme. Kids type prompts → generate 5 images →
 * click "Create Movie" → animated video stitched from all 5 frames plays.
 */
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import '../styles/movie-studio.css'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

// ── Frame state ──────────────────────────────────────────────────────────────
interface Frame {
  prompt: string
  imageUrl: string | null
  generating: boolean
  done: boolean
}

const EMPTY_FRAME = (): Frame => ({
  prompt: '',
  imageUrl: null,
  generating: false,
  done: false,
})

const FRAME_PLACEHOLDER_PROMPTS = [
  'A brave young hero discovers a glowing map in a magical forest…',
  'The hero follows fireflies over a sparkling bridge into an enchanted city…',
  'A friendly dragon lands and offers to help with the journey…',
  'Together they find the hidden treasure chest under a rainbow waterfall…',
  'Everyone celebrates with a feast as shooting stars fill the night sky…',
]

// ── Sidebar nav links (mirrors Dashboard) ───────────────────────────────────
const NAV_LINKS = [
  { id: 'home',         label: 'Home',          path: '/dashboard',    icon: '🏠' },
  { id: 'library',      label: 'Library',        path: '/shelf',        icon: '📚' },
  { id: 'rewards',      label: 'Rewards',        path: '/rewards',      icon: '⭐' },
  { id: 'games',        label: 'Games',          path: '/games',        icon: '🎮' },
  { id: 'movie-studio', label: 'Movie Studio',   path: '/movie-studio', icon: '🎬', active: true },
  { id: 'generate',     label: 'Create Story',   path: '/generate',     icon: '✨' },
]

type VideoState = 'idle' | 'creating' | 'done' | 'error'

const CREATION_STEPS = [
  'Bringing your frames to life…',
  'Animating Frame 1 ✓  Animating Frame 2…',
  'Stitching your movie together…',
  'Uploading to the cloud…',
  'Your movie is ready! 🎉',
]

export default function MovieStudio() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)

  const [frames, setFrames] = useState<Frame[]>(Array.from({ length: 5 }, EMPTY_FRAME))
  const [videoState, setVideoState] = useState<VideoState>('idle')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [creationStep, setCreationStep] = useState(0)
  const [creationProgress, setCreationProgress] = useState(0)
  const [tokensRemaining, setTokensRemaining] = useState(10)
  const [tokensTotal, setTokensTotal] = useState(10)
  const [showTokenGate, setShowTokenGate] = useState(false)
  const [studentId, setStudentId] = useState<string>('guest')
  const [purchasing, setPurchasing] = useState(false)
  const [copyDone, setCopyDone] = useState(false)

  // Load session + tokens on mount
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const sid = localStorage.getItem('readquest_student_id') || session?.user?.id || 'guest'
      setStudentId(sid)
      fetchTokens(sid)
    }
    init()
  }, [])

  const fetchTokens = async (sid: string) => {
    try {
      const res = await fetch(`${API_BASE}/movie-studio/tokens`, {
        headers: { 'X-Student-ID': sid },
      })
      if (res.ok) {
        const data = await res.json()
        setTokensRemaining(data.tokens_remaining ?? 10)
        setTokensTotal(data.tokens_total ?? 10)
      }
    } catch (_) {}
  }

  // ── Frame Prompt Change ───────────────────────────────────────────────────
  const updatePrompt = (idx: number, value: string) => {
    setFrames(prev => prev.map((f, i) => i === idx ? { ...f, prompt: value } : f))
  }

  // ── Generate Single Frame Image ──────────────────────────────────────────
  const generateFrame = async (idx: number) => {
    const frame = frames[idx]
    if (!frame.prompt.trim() || frame.generating) return

    setFrames(prev => prev.map((f, i) => i === idx ? { ...f, generating: true, done: false } : f))

    try {
      const res = await fetch(`${API_BASE}/movie-studio/generate-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-ID': studentId },
        body: JSON.stringify({ prompt: frame.prompt, frame_index: idx }),
      })
      const data = await res.json()
      if (data.image_url) {
        setFrames(prev => prev.map((f, i) =>
          i === idx ? { ...f, imageUrl: data.image_url, generating: false, done: true } : f
        ))
      } else {
        setFrames(prev => prev.map((f, i) =>
          i === idx ? { ...f, generating: false } : f
        ))
        alert('Image generation failed. Please try again.')
      }
    } catch (_) {
      setFrames(prev => prev.map((f, i) => i === idx ? { ...f, generating: false } : f))
      alert('Connection error. Please check your internet and try again.')
    }
  }

  // ── Create Video ─────────────────────────────────────────────────────────
  const createVideo = async () => {
    if (tokensRemaining <= 0) {
      setShowTokenGate(true)
      return
    }

    const imageUrls = frames.map(f => f.imageUrl || '')
    const filledUrls = imageUrls.filter(u => u)
    if (filledUrls.length < 5) {
      alert('Please generate all 5 frame images before creating your movie!')
      return
    }

    setVideoState('creating')
    setCreationProgress(0)
    setCreationStep(0)
    setVideoUrl(null)

    // Animate progress bar
    const progressInterval = setInterval(() => {
      setCreationProgress(p => {
        if (p >= 90) { clearInterval(progressInterval); return 90 }
        return p + Math.random() * 3
      })
    }, 800)

    // Cycle through steps
    const stepInterval = setInterval(() => {
      setCreationStep(s => Math.min(s + 1, CREATION_STEPS.length - 1))
    }, 8000)

    try {
      const res = await fetch(`${API_BASE}/movie-studio/create-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-ID': studentId },
        body: JSON.stringify({ image_urls: imageUrls, student_id: studentId }),
      })
      const data = await res.json()

      clearInterval(progressInterval)
      clearInterval(stepInterval)

      if (data.success && data.video_url) {
        setCreationProgress(100)
        setCreationStep(CREATION_STEPS.length - 1)
        setVideoUrl(data.video_url)
        setTokensRemaining(data.tokens_remaining ?? tokensRemaining - 1)
        setVideoState('done')

        // Auto-play the video
        setTimeout(() => {
          videoRef.current?.play().catch(() => {})
        }, 500)
      } else {
        setVideoState('error')
        alert(data.error || 'Video creation failed. Please try again.')
      }
    } catch (e) {
      clearInterval(progressInterval)
      clearInterval(stepInterval)
      setVideoState('error')
      alert('Connection error during video creation. Please try again.')
    }
  }

  // ── Token Purchase ────────────────────────────────────────────────────────
  const purchaseTokens = async () => {
    setPurchasing(true)
    try {
      const res = await fetch(`${API_BASE}/movie-studio/purchase-tokens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, package: '10_pack' }),
      })
      const data = await res.json()
      if (data.success) {
        setTokensRemaining(data.tokens_remaining)
        setTokensTotal(prev => prev + 10)
        setShowTokenGate(false)
      }
    } catch (_) {
      alert('Purchase failed. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  // ── Download Video ────────────────────────────────────────────────────────
  const downloadVideo = () => {
    if (!videoUrl) return
    const a = document.createElement('a')
    a.href = videoUrl
    a.download = `my-movie-studio-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // ── Copy link ──────────────────────────────────────────────────────────────
  const copyLink = async () => {
    if (!videoUrl) return
    try {
      await navigator.clipboard.writeText(videoUrl)
      setCopyDone(true)
      setTimeout(() => setCopyDone(false), 2500)
    } catch (_) {}
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const allFramesDone = frames.every(f => f.done && f.imageUrl)
  const anyGenerating = frames.some(f => f.generating)
  const framesReady = frames.filter(f => f.done && f.imageUrl).length
  const tokenLow = tokensRemaining <= 2

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="ms-root">
      {/* Starfield */}
      <div className="ms-stars" aria-hidden>
        {[...Array(28)].map((_, i) => (
          <div key={i} className="ms-star" style={{
            left: `${(i * 19 + 5) % 97}%`,
            top: `${(i * 29 + 7) % 93}%`,
            animationDelay: `${(i * 0.42) % 3}s`,
            width: `${(i % 3) + 1}px`, height: `${(i % 3) + 1}px`,
          }} />
        ))}
      </div>

      {/* ── Sidebar ── */}
      <aside className="ms-sidebar">
        <div>
          <div className="ms-logo">ReadQuest</div>
          <div className="ms-logo-sub">Movie Studio</div>
        </div>
        <nav className="ms-nav">
          {NAV_LINKS.map(link => (
            <button
              key={link.id}
              className={`ms-nav-link${link.active ? ' active' : ''}`}
              onClick={() => !link.active && navigate(link.path)}
              id={`ms-nav-${link.id}`}
            >
              <span style={{ fontSize: '1rem', lineHeight: 1 }}>{link.icon}</span>
              <span>{link.label}</span>
            </button>
          ))}
        </nav>
        <div className="ms-sidebar-bottom">
          <button className="ms-logout-btn" onClick={() => navigate('/dashboard')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Back to Dashboard</span>
          </button>
        </div>
      </aside>

      {/* ── Main Canvas ── */}
      <main className="ms-main">

        {/* Header */}
        <header className="ms-header">
          <div className="ms-header-left">
            <div className="ms-header-icon">🎬</div>
            <div>
              <div className="ms-title">Movie Studio</div>
              <div className="ms-title-sub">for Kids · Create Your Story</div>
            </div>
          </div>

          {/* Token badge */}
          <div className={`ms-token-badge${tokenLow ? ' low' : ''}`} id="ms-token-badge">
            <span className="ms-token-icon">🎟️</span>
            <span>
              <span className={`ms-token-count${tokenLow ? ' low' : ''}`}>{tokensRemaining}</span>
              <span style={{ color: 'rgba(204,195,216,0.5)', margin: '0 2px' }}>/</span>
              <span style={{ color: 'rgba(204,195,216,0.5)' }}>{tokensTotal}</span>
            </span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(204,195,216,0.5)' }}>videos left</span>
          </div>
        </header>

        {/* Content */}
        <div className="ms-content">

          {/* ── Storyboard Timeline ── */}
          <section className="ms-timeline-section">
            <div className="ms-section-title">🎞️ Your Storyboard — 5 Frames</div>

            <div className="ms-timeline" id="ms-timeline">
              {frames.map((frame, idx) => (
                <div key={idx} className="ms-frame" id={`ms-frame-${idx}`}>
                  {/* Image card */}
                  <div className="ms-frame-card ms-frame-coming-soon">
                    {/* Frame number badge */}
                    <div className="ms-frame-number">{idx + 1}</div>

                    {/* Coming Soon animated overlay */}
                    <div className="ms-coming-soon-overlay">
                      {/* Spotlight sweep */}
                      <div className="ms-cs-spotlight" />
                      {/* Film strip holes top */}
                      <div className="ms-cs-filmstrip ms-cs-filmstrip-top">
                        {[...Array(6)].map((_, i) => <div key={i} className="ms-cs-hole" />)}
                      </div>
                      {/* Center content */}
                      <div className="ms-cs-center">
                        <div className="ms-cs-reel">🎬</div>
                        <div className="ms-cs-text">Coming Soon</div>
                        <div className="ms-cs-stars">
                          {['✦','★','✦'].map((s, i) => (
                            <span key={i} className="ms-cs-star" style={{ animationDelay: `${i * 0.4}s` }}>{s}</span>
                          ))}
                        </div>
                      </div>
                      {/* Film strip holes bottom */}
                      <div className="ms-cs-filmstrip ms-cs-filmstrip-bottom">
                        {[...Array(6)].map((_, i) => <div key={i} className="ms-cs-hole" />)}
                      </div>
                    </div>
                  </div>

                  {/* Prompt area — kept for inspiration, but generate is disabled */}
                  <div className="ms-frame-prompt">
                    <label className="ms-frame-label" htmlFor={`ms-prompt-${idx}`}>
                      Frame {idx + 1} — Describe the scene
                    </label>
                    <textarea
                      id={`ms-prompt-${idx}`}
                      className="ms-frame-textarea"
                      value={frame.prompt}
                      onChange={e => updatePrompt(idx, e.target.value)}
                      placeholder={FRAME_PLACEHOLDER_PROMPTS[idx]}
                      rows={3}
                    />
                    <div className="ms-frame-coming-soon-btn" id={`ms-generate-btn-${idx}`}>
                      <span className="ms-cs-btn-dot" />
                      <span className="ms-cs-btn-dot" style={{ animationDelay: '0.2s' }} />
                      <span className="ms-cs-btn-dot" style={{ animationDelay: '0.4s' }} />
                      <span>AI Image Gen — Coming Soon</span>
                      <span className="ms-cs-btn-dot" style={{ animationDelay: '0.6s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Progress indicator */}
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.82rem', fontWeight: 700, color: 'rgba(192,132,252,0.6)' }}>
              {framesReady === 5
                ? '🎉 All 5 frames ready! Now create your movie below.'
                : `${framesReady}/5 frames generated — keep going!`}
            </div>
          </section>

          {/* ── Video Preview ── */}
          <section className="ms-preview-section">
            <div className="ms-section-title">🎥 Your Movie</div>

            <div className="ms-preview-container" id="ms-preview">
              <AnimatePresence mode="wait">
                {videoState === 'idle' && (
                  <motion.div
                    key="idle"
                    className="ms-preview-placeholder"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <div className="ms-preview-clapperboard">🎬</div>
                    <div className="ms-preview-placeholder-title">Your movie will play here</div>
                    <div className="ms-preview-placeholder-sub">
                      Generate all 5 frames by typing a scene description and clicking
                      "✨ Generate Image", then hit the big "Create Movie" button!
                    </div>
                  </motion.div>
                )}

                {videoState === 'creating' && (
                  <motion.div
                    key="creating"
                    className="ms-creation-progress"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <div className="ms-creation-reel">🎞️</div>
                    <div className="ms-creation-label">Creating Your Movie…</div>
                    <div className="ms-creation-sub">This takes about 2–3 minutes. Don't close this tab!</div>
                    <div className="ms-creation-progress-bar">
                      <div
                        className="ms-creation-progress-fill"
                        style={{ width: `${Math.min(creationProgress, 100)}%` }}
                      />
                    </div>
                    <div className="ms-creation-steps">
                      {CREATION_STEPS.map((step, i) => (
                        <div
                          key={i}
                          className={`ms-creation-step${i === creationStep ? ' active' : i < creationStep ? ' done' : ''}`}
                        >
                          {i < creationStep ? '✓ ' : i === creationStep ? '▶ ' : '○ '}{step}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {videoState === 'error' && (
                  <motion.div
                    key="error"
                    className="ms-preview-placeholder"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <div className="ms-preview-clapperboard">😔</div>
                    <div className="ms-preview-placeholder-title">Something went wrong</div>
                    <div className="ms-preview-placeholder-sub">
                      Video creation failed. Your image frames are saved — try clicking "Create Movie" again.
                    </div>
                  </motion.div>
                )}

                {videoState === 'done' && videoUrl && (
                  <motion.div
                    key="done"
                    style={{ width: '100%', height: '100%' }}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      className="ms-video-player"
                      controls
                      autoPlay
                      playsInline
                      id="ms-video-player"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* ── Action Bar ── */}
          <div className="ms-action-bar">
            {/* Create Movie */}
            <motion.button
              className={`ms-create-btn${videoState === 'creating' ? ' creating' : ''}`}
              onClick={createVideo}
              disabled={videoState === 'creating' || anyGenerating || (!allFramesDone && videoState !== 'error')}
              whileHover={videoState !== 'creating' ? { scale: 1.02 } : {}}
              whileTap={videoState !== 'creating' ? { scale: 0.97 } : {}}
              id="ms-create-movie-btn"
            >
              {videoState === 'creating' ? (
                <><div className="ms-spinner" style={{ width: 20, height: 20, borderWidth: 2.5 }} />Creating Movie…</>
              ) : videoState === 'done' ? (
                <>🎬 Create New Movie</>
              ) : (
                <>🎬 Create Movie</>
              )}
            </motion.button>

            {/* Download */}
            <button
              className="ms-action-btn"
              onClick={downloadVideo}
              disabled={!videoUrl}
              id="ms-download-btn"
            >
              ⬇️ Download
            </button>

            {/* Copy Link */}
            <button
              className="ms-action-btn"
              onClick={copyLink}
              disabled={!videoUrl}
              id="ms-copy-link-btn"
            >
              {copyDone ? '✅ Copied!' : '🔗 Copy Link'}
            </button>

            {/* YouTube — Coming Soon */}
            <button
              className="ms-action-btn youtube"
              disabled
              title="Coming soon!"
              id="ms-youtube-btn"
            >
              📺 Export to YouTube <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>(soon)</span>
            </button>
          </div>

        </div>{/* end ms-content */}
      </main>

      {/* ── Token Gate Overlay ── */}
      <AnimatePresence>
        {showTokenGate && (
          <motion.div
            className="ms-token-gate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            id="ms-token-gate"
          >
            <motion.div
              className="ms-token-gate-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <div className="ms-token-gate-icon">🎟️</div>
              <div className="ms-token-gate-title">Out of Movie Tokens</div>
              <div className="ms-token-gate-sub">
                You've used all your free movie creations.
                Get 10 more to keep the creativity going!
              </div>
              <div className="ms-token-price">$15</div>
              <div className="ms-token-price-sub">for 10 more movies · one-time</div>
              <button
                className="ms-token-buy-btn"
                onClick={purchaseTokens}
                disabled={purchasing}
                id="ms-buy-tokens-btn"
              >
                {purchasing ? '⏳ Processing…' : '🎟️ Get 10 More Movies — $15'}
              </button>
              <button className="ms-token-dismiss" onClick={() => setShowTokenGate(false)}>
                Maybe later
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
