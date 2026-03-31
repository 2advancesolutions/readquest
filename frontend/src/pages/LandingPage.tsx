import { useState, useEffect, useRef, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import '../styles/landing.css'

// ── Floating particles — pure CSS, zero JS animation cost ─────────────────
function Particles({ count = 8 }: { count?: number }) {
  const items = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: 5 + Math.random() * 90,
      y: 5 + Math.random() * 90,
      size: 3 + Math.random() * 4,
      dur: 3 + Math.random() * 4,
      delay: Math.random() * 3,
      id: i,
    }))
  ).current
  return (
    <>
      {items.map(p => (
        <div
          key={p.id}
          className="lp-particle"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </>
  )
}

// ── Feature card data ──────────────────────────────────────────────────────
// ── Feature card mini-previews ──────────────────────────────────────────────
const FEATURES = [
  {
    icon: '🎬',
    title: 'Movie Studio',
    desc: 'Transform stories into animated films with AI-generated art and voiceovers.',
    color: 'var(--nb-pink)',
    glow: 'rgba(236,72,153,0.18)',
    tag: 'Fan Favorite',
    tagColor: 'rgba(236,72,153,0.8)',
    preview: () => (
      <div className="fp-movie-full">
        {/* ── Mini sidebar ── */}
        <div className="fp-mf-sidebar">
          <div className="fp-mf-logo">
            <span style={{ fontSize: '0.85rem' }}>✨</span>
            <span className="fp-mf-logo-text">ReadQuest</span>
          </div>
          {[
            { icon: '🏠', label: 'Home' },
            { icon: '📚', label: 'Library' },
            { icon: '⭐', label: 'Rewards' },
            { icon: '🎮', label: 'Games' },
            { icon: '🎬', label: 'Studio', active: true },
            { icon: '✨', label: 'Create' },
          ].map(n => (
            <div key={n.label} className={`fp-mf-nav${n.active ? ' active' : ''}`}>
              <span>{n.icon}</span>
              <span>{n.label}</span>
            </div>
          ))}
        </div>
        {/* ── Main area ── */}
        <div className="fp-mf-main">
          <div className="fp-mf-board-title">🎞️ Your Storyboard — 5 Frames</div>
          <div className="fp-mf-frames">
            {['A brave hero discovers…', 'Fireflies lead the way…', 'A dragon offers help…', 'Hidden treasure found!', 'Stars fill the sky…'].map((scene, i) => (
              <div key={i} className="fp-mf-frame">
                <div className="fp-mf-card">
                  <div className="fp-mf-badge">{i + 1}</div>
                  <div className="fp-mf-strip"><div/><div/><div/></div>
                  {/* CSS-animated reel — no JS */}
                  <div className="fp-mf-reel fp-mf-reel-css" style={{ animationDuration: `${5 + i * 0.8}s` }}>🎬</div>
                  <div className="fp-mf-scan fp-mf-scan-css" style={{ animationDuration: `${2.2 + i * 0.3}s` }} />
                </div>
                <div className="fp-mf-scene">{scene}</div>
                <div className="fp-mf-chip">✨ AI Gen Soon</div>
              </div>
            ))}
          </div>
          <div className="fp-mf-actions">
            <div className="fp-mf-create fp-mf-create-pulse">🎬 Create Movie</div>
            <div className="fp-mf-btn">⬇️ Download</div>
            <div className="fp-mf-btn">🔗 Share</div>
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: '📖',
    title: 'Story Creator',
    desc: 'Co-create AI-powered personalized stories where your child is the hero.',
    color: 'var(--nb-purple)',
    glow: 'rgba(124,58,237,0.18)',
    tag: 'Most Popular',
    tagColor: 'rgba(124,58,237,0.8)',
    preview: () => (
      <div className="fp-story">
        <div className="fp-story-page">
          <img className="fp-story-char" src="/char_icons/nova.webp" alt="Nova Scout" loading="lazy" />
          <div className="fp-story-lines">
            {['Nova soared across', 'the midnight sky,', 'searching for home…'].map((l, i) => (
              <div key={i} className="fp-story-line fp-story-line-anim" style={{ animationDelay: `${i * 0.5}s` }}>{l}</div>
            ))}
          </div>
        </div>
        <div className="fp-story-pages">{'● ○ ○ ○ ○'}</div>
      </div>
    ),
  },
  {
    icon: '🔤',
    title: 'Spelling Arena',
    desc: 'Gamified vocabulary that adapts to your child\'s reading level in real time.',
    color: 'var(--nb-blue)',
    glow: 'rgba(56,189,248,0.18)',
    tag: 'Builds Skills',
    tagColor: 'rgba(56,189,248,0.8)',
    preview: () => (
      <div className="fp-spell">
        <div className="fp-spell-word">
          {['A','D','V','E','N','T','U','R','E'].map((letter, i) => (
            <div key={i} className={`fp-spell-tile${i < 5 ? ' done' : i === 5 ? ' active fp-spell-active-css' : ''}`}>{letter}</div>
          ))}
        </div>
        <div className="fp-spell-hint">🔊 &quot;ad · ven · ture&quot;</div>
        <div className="fp-spell-score">
          <div className="fp-spell-streak">🔥 5 streak</div>
          <div className="fp-spell-pts">+50 XP</div>
        </div>
      </div>
    ),
  },
  {
    icon: '🧠',
    title: 'Adaptive Exams',
    desc: 'Smart comprehension checks woven into story flow — no stress, pure growth.',
    color: 'var(--nb-green)',
    glow: 'rgba(16,185,129,0.18)',
    tag: 'AI Powered',
    tagColor: 'rgba(16,185,129,0.8)',
    preview: () => (
      <div className="fp-exam">
        <div className="fp-exam-q">What did Nova find in the forest?</div>
        {['A glowing map', 'A sleeping dragon', 'A golden key'].map((opt, i) => (
          <div key={i} className={`fp-exam-opt${i === 0 ? ' correct fp-exam-correct-css' : i === 1 ? ' selected' : ''}`}>
            {i === 0 ? '✓ ' : i === 1 ? '✗ ' : '○ '}{opt}
          </div>
        ))}
        <div className="fp-exam-result">🎉 Correct! +25 XP</div>
      </div>
    ),
  },
  {
    icon: '🎮',
    title: 'Educational Games',
    desc: 'Mini-games that unlock character rewards while teaching core literacy skills.',
    color: 'var(--nb-gold)',
    glow: 'rgba(251,191,36,0.18)',
    tag: 'Kids Love It',
    tagColor: 'rgba(251,191,36,0.8)',
    preview: () => (
      <div className="fp-game">
        <div className="fp-game-header">
          <span className="fp-game-name">🏆 Word Blaster</span>
          <span className="fp-game-lives">❤️❤️❤️</span>
        </div>
        <div className="fp-game-board">
          {['sky', 'moon', '???', 'star', 'sun', '???'].map((w, i) => (
            <div key={i} className={`fp-game-tile${w === '???' ? ' blank fp-game-blank-css' : ''}`}>{w}</div>
          ))}
        </div>
        <div className="fp-game-score">Score: <strong>1,240</strong> &nbsp;🔥 Level 7</div>
      </div>
    ),
  },
  {
    icon: '🏆',
    title: 'Leaderboard',
    desc: 'Safe, family-closed rankings that celebrate reading milestones together.',
    color: 'var(--nb-lavender)',
    glow: 'rgba(167,139,250,0.18)',
    tag: 'Community',
    tagColor: 'rgba(167,139,250,0.8)',
    preview: () => (
      <div className="fp-board">
        {[
          { rank: '🥇', name: 'Emma', xp: '4,820', you: false },
          { rank: '🥈', name: 'Liam', xp: '3,940', you: false },
          { rank: '🥉', name: 'You!', xp: '3,210', you: true },
          { rank: '4',  name: 'Sofia', xp: '2,890', you: false },
        ].map((r, i) => (
          <div key={i} className={`fp-board-row${r.you ? ' you fp-board-you-css' : ''}`}>
            <span className="fp-board-rank">{r.rank}</span>
            <span className="fp-board-name">{r.name}</span>
            <span className="fp-board-xp">⭐ {r.xp} XP</span>
          </div>
        ))}
      </div>
    ),
  },
]



// Mini-preview character list — all original AI-generated artworks, zero copyrighted IP
const PREVIEW_CHARS = [
  { name: 'Sparkle',      img: '/char_icons/unicorn.webp'      },
  { name: 'Leo the Lion', img: '/char_icons/lion.webp'         },
  { name: 'Princess Kira',img: '/char_icons/knight_girl.webp'  },
  { name: 'Nova Pulse',   img: '/char_icons/nova_pulse.webp'   },
  { name: 'Marina',       img: '/char_icons/mermaid.webp'      },
  { name: 'Jade Dragon',  img: '/char_icons/dragon.webp'       },
  { name: 'Merlin',       img: '/char_icons/merlin.webp'       },
  { name: 'Coral Diver',  img: '/char_icons/coral_diver.webp'  },
  { name: 'Sovereign',    img: '/char_icons/sovereign.webp'    },
  { name: 'Cipher',       img: '/char_icons/cipher.webp'       },
  { name: 'Shadow Fox',   img: '/char_icons/fox.webp'          },
  { name: 'Zap the Robot',img: '/char_icons/robot.webp'        },
]

const PREVIEW_THEMES = [
  { emoji: '🚀', label: 'Space Explorer' },
  { emoji: '🌲', label: 'Magic Forest' },
  { emoji: '🌊', label: 'Ocean Deep' },
  { emoji: '🏰', label: 'Fantasy Castle' },
  { emoji: '🦕', label: 'Dino World' },
  { emoji: '🦸', label: 'Superhero City' },
  { emoji: '🏴‍☠️', label: 'Pirate Quest' },
  { emoji: '🤖', label: 'Robot World' },
  { emoji: '🍭', label: 'Candy Kingdom' },
]

const STATS = [
  { value: '50K+', label: 'Stories Created', icon: '📚' },
  { value: '97%', label: 'Parent Satisfaction', icon: '⭐' },
  { value: '10', label: 'Languages Supported', icon: '🌍' },
  { value: '1M+', label: 'Words Read', icon: '🎯' },
]

// ── Animated counter ───────────────────────────────────────────────────────
function AnimatedStat({ value, label, icon, delay }: { value: string; label: string; icon: string; delay: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      className="lp-stat-item"
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
    >
      <span className="lp-stat-icon">{icon}</span>
      <span className="lp-stat-value">{value}</span>
      <span className="lp-stat-label">{label}</span>
    </motion.div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const particles = useRef(
    Array.from({ length: 18 }, (_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 3 + Math.random() * 5,
      delay: Math.random() * 2,
      id: i,
    }))
  ).current

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const heroRef = useRef(null)
  const featuresRef = useRef(null)
  const stepsRef = useRef(null)
  // Looser margins so sections animate in earlier — reduces perceived lag
  const featuresInView = useInView(featuresRef, { once: true, margin: '0px' })
  const stepsInView = useInView(stepsRef, { once: true, margin: '0px' })


  return (
    <div className="lp-root">

      {/* ── Ambient background ── */}
      <div className="lp-bg-orb lp-orb-1" />
      <div className="lp-bg-orb lp-orb-2" />
      <div className="lp-bg-orb lp-orb-3" />
      {/* CSS-only particles — no JS animation overhead */}
      <Particles count={8} />

      {/* ════════════════ NAV ════════════════ */}
      <nav className={`lp-nav${scrolled ? ' lp-nav-scrolled' : ''}`}>
        <div className="lp-nav-inner">
          <div className="lp-nav-logo">
            <span className="lp-logo-icon">✨</span>
            <span className="lp-logo-text">ReadQuest</span>
          </div>
          <div className="lp-nav-links">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#how" className="lp-nav-link">How It Works</a>
            <a href="#cta" className="lp-nav-link">Pricing</a>
          </div>
          <div className="lp-nav-actions">
            <button className="lp-btn-ghost" onClick={() => navigate('/login')}>Sign In</button>
            <button className="lp-btn-primary" onClick={() => navigate('/signup')}>Start Free →</button>
          </div>
          <button className="lp-hamburger" onClick={() => setMobileMenuOpen(o => !o)}>
            <span /><span /><span />
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              className="lp-mobile-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#how" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <button className="lp-btn-primary w-full" onClick={() => navigate('/signup')}>Start Free →</button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ════════════════ HERO ════════════════ */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-inner">

          {/* Left copy */}
          <div className="lp-hero-copy">
            <motion.div
              className="lp-hero-badge"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              🚀 AI-Powered Learning Platform
            </motion.div>

            <motion.h1
              className="lp-hero-headline"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              Where Stories
              <span className="lp-gradient-text"> Come Alive</span>
            </motion.h1>

            <motion.p
              className="lp-hero-sub"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              AI-powered reading adventures personalized for every child. Pick a character, choose a theme, and watch the magic begin.
            </motion.p>

            <motion.div
              className="lp-hero-actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
            >
              <button className="lp-btn-gold" onClick={() => navigate('/signup')}>
                Create a Story →
              </button>
              <a href="#how" className="lp-btn-outline">
                See How It Works
              </a>
            </motion.div>

            <motion.div
              className="lp-hero-pills"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              {[
                { icon: '📚', text: '50K+ Stories Created' },
                { icon: '🌍', text: '10 Languages' },
                { icon: '🎯', text: '1M Words Read' },
              ].map(p => (
                <div className="lp-hero-pill" key={p.text}>
                  <span>{p.icon}</span>
                  <span>{p.text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right visual */}
          <motion.div
            className="lp-hero-visual"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            <div className="lp-book-card">
              <div className="lp-book-glow" />
              <div className="lp-book-inner">
                <div className="lp-book-cover">
                  <div className="lp-book-carousel">
                    {[
                      { isbn: '0399226907', title: 'Very Hungry Caterpillar' },
                      { isbn: '0064430170', title: 'Goodnight Moon' },
                      { isbn: '0064431789', title: 'Where the Wild Things Are' },
                      { isbn: '0395389496', title: 'The Polar Express' },
                      { isbn: '0064400557', title: "Charlotte's Web" },
                      { isbn: '0142410381', title: 'James and the Giant Peach' },
                      { isbn: '0064440206', title: 'Frog and Toad' },
                      { isbn: '0440412072', title: 'The Giver' },
                    ].map((book, i) => (
                      <motion.img
                        key={book.isbn}
                        src={`https://covers.openlibrary.org/b/isbn/${book.isbn}-L.jpg`}
                        alt={book.title}
                        loading="lazy"
                        className="lp-carousel-img"
                        initial={{ opacity: 0 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          scale: [0.94, 1, 1, 0.97],
                        }}
                        transition={{
                          duration: 3,
                          delay: i * 2.5,
                          repeat: Infinity,
                          repeatDelay: (8 - 1) * 2.5 - 3,
                          ease: 'easeInOut',
                        }}
                      />
                    ))}
                    <div className="lp-carousel-badge">
                      <span>⭐ 4.9</span>
                      <span className="lp-carousel-count">50K+ books</span>
                    </div>
                  </div>
                </div>
                <div className="lp-book-spine" />
                <div className="lp-book-pages">
                  <div className="lp-book-page-line" />
                  <div className="lp-book-page-line lp-line-2" />
                  <div className="lp-book-page-line lp-line-3" />
                </div>
              </div>
              {/* Floating character chips */}
              <motion.div className="lp-float-chip lp-chip-1" animate={{ y: [-4, 4, -4] }} transition={{ duration: 2.5, repeat: Infinity }}>
                🦁 Leo the Lion
              </motion.div>
              <motion.div className="lp-float-chip lp-chip-2" animate={{ y: [4, -4, 4] }} transition={{ duration: 3, repeat: Infinity }}>
                🚀 Nova Scout
              </motion.div>
              <motion.div className="lp-float-chip lp-chip-3" animate={{ y: [-6, 6, -6] }} transition={{ duration: 3.5, repeat: Infinity }}>
                🐉 Jade Dragon
              </motion.div>
              {/* Sparkles */}
              {['✦', '✦', '★', '✦'].map((s, i) => (
                <motion.span key={i} className={`lp-sparkle lp-sp-${i + 1}`}
                  animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                >{s}</motion.span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div className="lp-scroll-hint"
          animate={{ y: [0, 6, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <div className="lp-scroll-dot" />
        </motion.div>
      </section>

      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section id="how" className="lp-section lp-how-section" ref={stepsRef}>
        <div className="lp-section-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 20 }}
            animate={stepsInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="lp-section-badge">🪄 How It Works</div>
            <h2 className="lp-section-title">3 Simple Steps<br /><span className="lp-gradient-text">to Magic</span></h2>
            <p className="lp-section-sub">From character selection to immersive reading — the whole experience in under 60 seconds.</p>
          </motion.div>

          {/* ── Step timeline ── */}
          <div className="lp-step-timeline">
            {[
              { n: '01', label: 'Pick Your Hero' },
              { n: '02', label: 'Choose a Theme' },
              { n: '03', label: 'Start Reading' },
            ].map(({ n, label }, i) => (
              <div key={n} className="lp-timeline-node">
                <div className="lp-timeline-bubble-wrap">
                  <div className="lp-timeline-bubble">{n}</div>
                  <div className="lp-timeline-step-label">{label}</div>
                </div>
                {i < 2 && <div className="lp-timeline-line" />}
              </div>
            ))}
          </div>

          {/* ── 3 mini app previews ── */}
          <div className="lp-previews">

            {/* ── STEP 1: Character Gallery ── */}
            <motion.div
              className="lp-preview-wrap"
              initial={{ opacity: 0, y: 40 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0 }}
            >
              <div className="lp-preview-label">
                <span className="lp-preview-step">Step 1</span>
                <span className="lp-preview-title">Pick Your Hero</span>
                <span className="lp-preview-sub">Choose from 80+ beloved characters</span>
              </div>
              <div className="lp-app-window">
                <div className="lp-app-titlebar">
                  <div className="lp-tb-dots"><span/><span/><span/></div>
                  <div className="lp-tb-label">🦸 Choose Your Character</div>
                </div>
                <div className="lp-app-body lp-char-preview">
                  <div className="lp-prev-search">
                    <span className="lp-prev-search-icon">🔍</span>
                    <span className="lp-prev-search-text">Search characters...</span>
                  </div>
                  <div className="lp-prev-chars-label">Characters kids love — click one to make them your hero!</div>
                  <div className="lp-prev-char-grid">
                    {PREVIEW_CHARS.slice(0, 12).map((c, idx) => (
                      <motion.div
                        key={c.name}
                        className={`lp-prev-char${idx === 0 ? ' lp-prev-char-selected' : ''}`}
                        whileHover={{ scale: 1.08, y: -2 }}
                      >
                        <div className="lp-prev-char-circle">
                          <img src={c.img} alt={c.name} className="lp-prev-char-img" loading="lazy" decoding="async" />
                        </div>
                        <span className="lp-prev-char-name">{c.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── STEP 2: Theme Picker ── */}
            <motion.div
              className="lp-preview-wrap"
              initial={{ opacity: 0, y: 40 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div className="lp-preview-label">
                <span className="lp-preview-step">Step 2</span>
                <span className="lp-preview-title">Choose a Theme</span>
                <span className="lp-preview-sub">20+ adventure worlds to explore</span>
              </div>
              <div className="lp-app-window">
                <div className="lp-app-titlebar">
                  <div className="lp-tb-dots"><span/><span/><span/></div>
                  <div className="lp-tb-label">🌍 Pick an Adventure Theme</div>
                </div>
                <div className="lp-app-body lp-theme-preview">
                  <div className="lp-prev-section-label">🎨 Choose a Theme</div>
                  <div className="lp-prev-theme-grid">
                    {PREVIEW_THEMES.map((t, idx) => (
                      <motion.div
                        key={t.label}
                        className={`lp-prev-theme-card${idx === 1 ? ' lp-prev-theme-selected' : ''}`}
                        whileHover={{ scale: 1.04, y: -2 }}
                      >
                        {idx === 1 && <div className="lp-prev-theme-check">✓</div>}
                        <span className="lp-prev-theme-emoji">{t.emoji}</span>
                        <span className="lp-prev-theme-label">{t.label}</span>
                      </motion.div>
                    ))}
                  </div>
                  <div className="lp-prev-gen-btn">
                    <span>✨</span> Create My Story
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── STEP 3: Story Reader ── */}
            <motion.div
              className="lp-preview-wrap"
              initial={{ opacity: 0, y: 40 }}
              animate={stepsInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="lp-preview-label">
                <span className="lp-preview-step">Step 3</span>
                <span className="lp-preview-title">Start Reading</span>
                <span className="lp-preview-sub">AI voices, art &amp; quizzes — live</span>
              </div>
              <div className="lp-app-window">
                <div className="lp-app-titlebar">
                  <div className="lp-tb-dots"><span/><span/><span/></div>
                  <div className="lp-tb-label">📖 Nova's Space Adventure · Page 1</div>
                </div>
                <div className="lp-app-body lp-reader-preview">
                  <div className="lp-reader-layout">
                    <div className="lp-reader-img-col">
                      <div className="lp-reader-scene-img">
                        <img
                          src="/char_icons/nova.webp"
                          alt="Nova Scout"
                          className="lp-reader-char-img"
                          loading="lazy"
                          decoding="async"
                        />
                        <div className="lp-reader-scene-label">🚀 Outer Space</div>
                      </div>
                    </div>
                    <div className="lp-reader-text-col">
                      <div className="lp-reader-page-num">Page 1 of 5</div>
                      <div className="lp-reader-text-lines">
                        <div className="lp-rtl lp-rtl-highlight">Nova zoomed through the stars,</div>
                        <div className="lp-rtl">her jetpack blazing trails of light</div>
                        <div className="lp-rtl">across the galaxy. &quot;To the edge</div>
                        <div className="lp-rtl">of discovery!&quot; she cried.</div>
                        <div className="lp-rtl lp-rtl-next">Far below, a tiny planet</div>
                        <div className="lp-rtl lp-rtl-next">glowed like a green jewel...</div>
                      </div>
                      <div className="lp-reader-words">
                        {['Nova', 'zoomed', 'through', 'the', 'stars'].map((w, wi) => (
                          <span key={w} className={`lp-word${wi === 1 ? ' lp-word-active' : wi < 1 ? ' lp-word-done' : ''}`}>{w}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="lp-reader-mic-bar">
                    <div className="lp-mic-icon">🎤</div>
                    <div className="lp-mic-waves">
                      {[1,2,3,4,5,6,7].map(b => (
                        <motion.div key={b} className="lp-mic-wave"
                          animate={{ scaleY: [0.3, 1, 0.5, 0.8, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity, delay: b * 0.12, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                    <span className="lp-mic-label">Listening...</span>
                    <div className="lp-stardust-bar lp-mic-progress">
                      <motion.div className="lp-stardust-fill"
                        animate={{ width: ['0%', '70%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'linear' }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ════════════════ MOVIE STUDIO SPOTLIGHT ════════════════ */}
      <section className="lp-section lp-studio-section">
        <div className="lp-studio-inner">

          {/* Left: copy */}
          <motion.div
            className="lp-studio-copy"
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="lp-section-badge">🎬 Movie Studio</div>
            <h2 className="lp-studio-title">
              Unleash Your Child's<br />
              <span className="lp-gradient-text">Inner Director</span>
            </h2>
            <p className="lp-studio-desc">
              Movie Studio turns imagination into animated films. Kids write scene descriptions,
              AI generates the artwork, and with one tap their story becomes a real movie they
              can share with family and friends.
            </p>

            <div className="lp-studio-pillars">
              {[
                { icon: '✍️', title: 'Write Scenes', desc: 'Describe 5 story moments in their own words' },
                { icon: '🎨', title: 'AI Generates Art', desc: 'Each scene becomes a stunning illustration' },
                { icon: '🎞️', title: 'Auto-Animated', desc: 'Frames are stitched into a real MP4 movie' },
                { icon: '🚀', title: 'Share & Keep', desc: 'Download or share their masterpiece instantly' },
              ].map((p, i) => (
                <motion.div
                  key={p.title}
                  className="lp-studio-pillar"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <div className="lp-studio-pillar-icon">{p.icon}</div>
                  <div>
                    <div className="lp-studio-pillar-title">{p.title}</div>
                    <div className="lp-studio-pillar-desc">{p.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.button
              className="lp-btn-gold lp-studio-cta"
              onClick={() => navigate('/signup')}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              🎬 Try Movie Studio Free →
            </motion.button>
          </motion.div>

          {/* Right: Mini Movie Studio mockup */}
          <motion.div
            className="lp-studio-preview"
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            {/* Glow behind window */}
            <div className="lp-studio-glow" />

            <div className="lp-studio-window">
              {/* macOS titlebar */}
              <div className="lp-studio-titlebar">
                <div className="lp-tb-dots"><span/><span/><span/></div>
                <div className="lp-tb-label">🎬 Movie Studio · Your Storyboard</div>
                <div className="lp-studio-token-badge">🎟️ 8/10 movies left</div>
              </div>

              {/* Sidebar + main */}
              <div className="lp-studio-layout">

                {/* Mini sidebar */}
                <div className="lp-studio-sidebar">
                  <div className="lp-studio-logo-mini">
                    <span className="lp-logo-icon" style={{ fontSize: '0.9rem' }}>✨</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>ReadQuest</span>
                  </div>
                  {[
                    { icon: '🏠', label: 'Home' },
                    { icon: '📚', label: 'Library' },
                    { icon: '⭐', label: 'Rewards' },
                    { icon: '🎮', label: 'Games' },
                    { icon: '🎬', label: 'Studio', active: true },
                    { icon: '✨', label: 'Create' },
                  ].map(n => (
                    <div key={n.label} className={`lp-studio-nav-item${n.active ? ' active' : ''}`}>
                      <span>{n.icon}</span>
                      <span>{n.label}</span>
                    </div>
                  ))}
                </div>

                {/* Main content */}
                <div className="lp-studio-main">
                  <div className="lp-studio-section-title">🎞️ Your Storyboard — 5 Frames</div>

                  {/* 5 frame cards */}
                  <div className="lp-studio-frames">
                    {[
                      'A brave hero discovers a glowing map…',
                      'Fireflies lead across a sparkling bridge…',
                      'A friendly dragon offers to help…',
                      'Hidden treasure under a rainbow waterfall…',
                      'Stars fill the sky as everyone celebrates…',
                    ].map((placeholder, fi) => (
                      <div key={fi} className="lp-studio-frame">
                        <div className="lp-studio-frame-card">
                          {/* Card number */}
                          <div className="lp-studio-frame-num">{fi + 1}</div>
                          {/* Film strip holes top */}
                          <div className="lp-studio-filmstrip">
                            {[0,1,2,3].map(h => <div key={h} className="lp-studio-hole" />)}
                          </div>
                          {/* Animated reel icon + spotlight */}
                          <motion.div
                            className="lp-studio-frame-reel"
                            animate={{ rotate: [0, 360] }}
                            transition={{ duration: 6 + fi, repeat: Infinity, ease: 'linear' }}
                          >🎬</motion.div>
                          {/* Bottom stripe */}
                          <div className="lp-studio-filmstrip lp-studio-filmstrip-bottom">
                            {[0,1,2,3].map(h => <div key={h} className="lp-studio-hole" />)}
                          </div>
                          {/* Animated scanning line */}
                          <motion.div
                            className="lp-studio-scan-line"
                            animate={{ top: ['10%', '90%', '10%'] }}
                            transition={{ duration: 2.5 + fi * 0.3, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        </div>
                        <div className="lp-studio-frame-prompt-mini">
                          <span>{placeholder}</span>
                          <div className="lp-studio-gen-chip">✨ AI Gen Soon</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action bar */}
                  <div className="lp-studio-action-bar">
                    <motion.div
                      className="lp-studio-create-btn"
                      animate={{
                        boxShadow: ['0 0 12px rgba(234,179,8,0.2)', '0 0 28px rgba(234,179,8,0.5)', '0 0 12px rgba(234,179,8,0.2)'],
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      🎬 Create Movie
                    </motion.div>
                    <div className="lp-studio-mini-btn">⬇️ Download</div>
                    <div className="lp-studio-mini-btn">🔗 Share</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ════════════════ STATS BAND ════════════════ */}

      <section className="lp-stats-band">
        <div className="lp-stats-inner">
          {STATS.map((s, i) => (
            <AnimatedStat key={s.label} {...s} delay={i * 0.1} />
          ))}
        </div>
      </section>

      {/* ════════════════ FEATURES ════════════════ */}
      <section id="features" className="lp-section lp-features-section" ref={featuresRef}>
        <div className="lp-section-inner">
          <motion.div
            className="lp-section-header"
            initial={{ opacity: 0, y: 20 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="lp-section-badge">✨ Full Platform</div>
            <h2 className="lp-section-title">Everything Your Child<br /><span className="lp-gradient-text">Needs to Excel</span></h2>
            <p className="lp-section-sub">Immersive features designed to turn reading from a chore into a daily adventure.</p>
          </motion.div>

          <div className="lp-features-grid">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="lp-feature-card"
                style={{ '--card-glow': f.glow, '--card-color': f.color } as React.CSSProperties}
                initial={{ opacity: 0, y: 40 }}
                animate={featuresInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
              >
                {/* Mini preview window */}
                <div className="lp-feature-preview-wrap">
                  <div className="lp-feature-preview-bar">
                    <div className="lp-tb-dots"><span/><span/><span/></div>
                    <div className="lp-tb-label" style={{ fontSize: '0.6rem' }}>{f.icon} {f.title}</div>
                  </div>
                  <div className="lp-feature-preview-body">
                    {f.preview()}
                  </div>
                </div>

                {/* Card footer */}
                <div className="lp-feature-footer">
                  <div className="lp-feature-footer-top">
                    <div className="lp-feature-title-row">
                      <span className="lp-feature-icon">{f.icon}</span>
                      <h3 className="lp-feature-title">{f.title}</h3>
                    </div>
                    <div className="lp-feature-tag" style={{ '--tag-color': f.tagColor } as React.CSSProperties}>
                      {f.tag}
                    </div>
                  </div>
                  <p className="lp-feature-desc">{f.desc}</p>
                  <div className="lp-feature-arrow">Explore →</div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ════════════════ TRUST BAND ════════════════ */}
      <section className="lp-trust-band">
        <div className="lp-trust-inner">
          <div className="lp-trust-copy">
            <h2 className="lp-trust-title">Trusted by <span className="lp-gradient-text">10,000+ Families</span></h2>
            <p className="lp-trust-sub">ReadQuest has helped children across the world discover a love for reading through magical, personalized stories.</p>
          </div>
          <div className="lp-trust-logos">
            {['📚', '🎓', '🏫', '👨‍👩‍👧‍👦', '🌟'].map((e, i) => (
              <div key={i} className="lp-trust-logo">{e}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ CTA BANNER ════════════════ */}
      <section id="cta" className="lp-cta-section">
        <div className="lp-cta-inner">
          <div className="lp-cta-glow" />
          <motion.div
            className="lp-cta-content"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="lp-cta-emoji">🚀</div>
            <h2 className="lp-cta-title">Ready to Start Your<br /><span className="lp-gradient-text">Reading Adventure?</span></h2>
            <p className="lp-cta-sub">Join 10,000+ families sparking their child's imagination today.<br />No credit card required • 7-day free premium trial</p>
            <div className="lp-cta-form">
              <input
                type="email"
                className="lp-cta-input"
                placeholder="Enter your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              <button className="lp-btn-gold" onClick={() => navigate('/signup')}>
                Get Started Free →
              </button>
            </div>
            <p className="lp-cta-fine">No spam, ever. Cancel anytime.</p>
          </motion.div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer className="lp-footer">
        {/* Top glow divider */}
        <div className="lp-footer-glow-bar" />

        <div className="lp-footer-inner">
          {/* Brand column */}
          <div className="lp-footer-brand">
            <div className="lp-nav-logo" style={{ marginBottom: '12px' }}>
              <span className="lp-logo-icon">✨</span>
              <span className="lp-logo-text">ReadQuest</span>
            </div>
            <p className="lp-footer-tagline">
              Making reading magical, one story at a time. Helping kids discover the joy of books through personalized AI adventures.
            </p>

            {/* Newsletter */}
            <div className="lp-footer-newsletter">
              <div className="lp-footer-nl-label">📬 Get reading tips &amp; updates</div>
              <div className="lp-footer-nl-row">
                <input className="lp-footer-nl-input" type="email" placeholder="you@email.com" />
                <button className="lp-footer-nl-btn">Subscribe</button>
              </div>
            </div>

            {/* Social icons */}
            <div className="lp-footer-socials">
              {[
                { icon: '𝕏', label: 'Twitter' },
                { icon: '📸', label: 'Instagram' },
                { icon: '▶️', label: 'YouTube' },
                { icon: '🎵', label: 'TikTok' },
              ].map(s => (
                <div key={s.label} className="lp-footer-social" title={s.label}>{s.icon}</div>
              ))}
            </div>
          </div>

          {/* Product links */}
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Platform</div>
            {[
              { label: '🎬 Movie Studio', href: '#' },
              { label: '📖 Story Creator', href: '#' },
              { label: '🔤 Spelling Arena', href: '#' },
              { label: '🧠 Adaptive Exams', href: '#' },
              { label: '🎮 Educational Games', href: '#' },
              { label: '🏆 Leaderboard', href: '#' },
            ].map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
          </div>

          {/* Company links */}
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Company</div>
            {[
              { label: 'About Us', href: '#' },
              { label: 'Blog', href: '#' },
              { label: 'Careers', href: '#' },
              { label: 'Press Kit', href: '#' },
              { label: 'Contact', href: '#' },
            ].map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
          </div>

          {/* Legal links */}
          <div className="lp-footer-col">
            <div className="lp-footer-col-title">Support</div>
            {[
              { label: 'Help Center', href: '#' },
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms of Service', href: '#' },
              { label: 'Cookie Policy', href: '#' },
              { label: 'Accessibility', href: '#' },
            ].map(l => <a key={l.label} href={l.href}>{l.label}</a>)}
          </div>
        </div>

        {/* Feature tags strip */}
        <div className="lp-footer-tags-strip">
          {['🔒 COPPA Compliant', '👨‍👩‍👧 Family Safe', '🎓 Educator Approved', '🌍 10 Languages', '📱 iOS & Android Coming Soon', '⭐ 4.9 / 5 Rating'].map(t => (
            <div key={t} className="lp-footer-tag">{t}</div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="lp-footer-bottom">
          <span>© 2025 ReadQuest, Inc. All rights reserved.</span>
          <div className="lp-footer-bottom-badges">
            <div className="lp-footer-badge">🔒 SSL Secured</div>
            <div className="lp-footer-badge">🍪 Cookie-Free Analytics</div>
          </div>
          <span>Made with ✨ for young readers everywhere</span>
        </div>
      </footer>

    </div>
  )
}
