import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { storiesApi } from '../services/api'
import { useLike } from '../hooks/useLike'
import { supabase } from '../lib/supabase'
import '../styles/public-books.css'

const API = import.meta.env.VITE_API_URL ?? ''

function getSessionKey(): string {
  const k = 'rq_session_key'
  let sk = localStorage.getItem(k)
  if (!sk) {
    sk = `anon_${Math.random().toString(36).slice(2)}_${Date.now()}`
    localStorage.setItem(k, sk)
  }
  return sk
}
// ── Date formatter ─────────────────────────────────────────────────────
function formatCreatedDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1d ago'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}


const FILTER_TYPES = [
  { label: 'All', value: 'all' },
  { label: '🎨 Cartoon', value: 'cartoon' },
  { label: '💥 Comic', value: 'comic' },
  { label: '🖌️ Watercolor', value: 'watercolor' },
  { label: '✨ Fantasy', value: 'fantasy' },
  { label: '🌸 Anime', value: 'anime' },
  { label: '📸 Realistic', value: 'realistic' },
]

// ── Theme emoji helper ──────────────────────────────────────────────────
function themeEmoji(theme: string): string {
  const t = theme.toLowerCase()
  if (t.includes('space') || t.includes('star') || t.includes('galaxy')) return '🚀'
  if (t.includes('ocean') || t.includes('sea') || t.includes('water')) return '🌊'
  if (t.includes('forest') || t.includes('jungle') || t.includes('tree')) return '🌲'
  if (t.includes('dragon') || t.includes('castle') || t.includes('knight')) return '🏰'
  if (t.includes('dino') || t.includes('dinosaur')) return '🦕'
  if (t.includes('robot') || t.includes('tech')) return '🤖'
  if (t.includes('pirate')) return '🏴‍☠️'
  if (t.includes('superhero') || t.includes('hero')) return '🦸'
  if (t.includes('candy') || t.includes('sweet')) return '🍭'
  if (t.includes('magic')) return '✨'
  return '📖'
}


// ── Book type ───────────────────────────────────────────────────────────
interface PublicBook {
  id: string
  title: string
  theme: string
  grade_level: number
  cover_media_url: string | null
  art_style: string
  created_at: string
  creator_id: string | null
  creator_name: string
  view_count: number
  like_count: number
}

// ── Skeleton loader cards ───────────────────────────────────────────────
function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="pb-skeleton" />
          <div style={{ height: 12, borderRadius: 6, background: 'rgba(57,47,82,0.5)', width: '80%' }} />
          <div style={{ height: 10, borderRadius: 6, background: 'rgba(57,47,82,0.3)', width: '55%' }} />
        </div>
      ))}
    </>
  )
}

// ── 3D Book Card ────────────────────────────────────────────────────────
function BookCard({
  book,
  selected,
  onClick,
}: {
  book: PublicBook
  selected: boolean
  onClick: () => void
}) {
  const emoji = themeEmoji(book.theme)
  const { likeCount, alreadyLiked, like } = useLike(book.id, book.like_count)

  return (
    <div
      className={`pb-book-card${selected ? ' selected' : ''}`}
      onClick={onClick}
      title={book.title}
    >
      <div className="pb-book-3d">
        <div className="pb-book-spine" />
        {book.cover_media_url ? (
          <img
            src={book.cover_media_url}
            alt={book.title}
            className="pb-book-cover-img"
            loading="lazy"
            onError={(e) => {
              ;(e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="pb-book-cover-placeholder">{emoji}</div>
        )}
        <div className="pb-book-pages" />
        <div className="pb-book-overlay" />
        <div className="pb-book-badge">{book.art_style || 'cartoon'}</div>
      </div>
      <div className="pb-book-info">
        <div className="pb-book-title">{book.title}</div>
        <div className="pb-book-creator">by {book.creator_name}</div>
        {book.created_at && (
          <div className="pb-book-date">🕐 {formatCreatedDate(book.created_at)}</div>
        )}
        <div className="pb-book-likes-row">
          <button
            className={`pb-like-mini${alreadyLiked ? ' liked' : ''}`}
            onClick={e => { e.stopPropagation(); like() }}
            title={alreadyLiked ? 'Already liked!' : 'Like this book'}
          >
            {alreadyLiked ? '♥' : '♡'}
          </button>
          <span className="pb-like-mini-count">{likeCount}</span>
        </div>
      </div>
    </div>
  )
}

// ── Like Button (detail sidebar) ────────────────────────────────────────────────────────────────────────────────────────────
function LikeButton({ storyId, initialCount }: { storyId: string; initialCount: number }) {
  const { likeCount, alreadyLiked, like, loading } = useLike(storyId, initialCount)
  return (
    <div className="pb-like-wrap">
      <button
        className={`pb-like-btn${alreadyLiked ? ' liked' : ''}`}
        onClick={like}
        disabled={alreadyLiked || loading}
        title={alreadyLiked ? 'You already liked this!' : 'Like this book'}
      >
        <span className="pb-like-heart">{alreadyLiked ? '♥' : '♡'}</span>
        <span>{alreadyLiked ? 'Liked! ♥' : 'Like this book'}</span>
      </button>
      <span className="pb-like-count">{likeCount} like{likeCount !== 1 ? 's' : ''}</span>
    </div>
  )
}

// ── useSave hook ─────────────────────────────────────────────────────
function useSave(storyId: string | null, studentId: string | null) {
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!storyId || !studentId) { setSaved(false); return }
    storiesApi.getSaveStatus(studentId, storyId)
      .then((r: { saved: boolean }) => setSaved(r.saved))
      .catch(() => {})
  }, [storyId, studentId])

  const toggle = async () => {
    if (!storyId || !studentId || saving) return
    setSaving(true)
    try {
      if (saved) {
        await storiesApi.unsaveStory(studentId, storyId)
        setSaved(false)
      } else {
        await storiesApi.saveStory(studentId, storyId)
        setSaved(true)
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  return { saved, saving, toggle }
}

// ── Detail Sidebar ──────────────────────────────────────────────────────
function DetailSidebar({
  book,
  onClose,
  isLoggedIn,
  studentId,
}: {
  book: PublicBook | null
  onClose: () => void
  isLoggedIn: boolean
  studentId: string | null
}) {
  const navigate = useNavigate()
  const { saved, saving, toggle } = useSave(book?.id ?? null, studentId)
  if (!book) {
    return (
      <div className="pb-detail-panel">
        <div className="pb-detail-empty">
          <div className="pb-detail-empty-icon">📚</div>
          <div className="pb-detail-empty-msg">Select a book to preview it</div>
        </div>
      </div>
    )
  }

  const emoji = themeEmoji(book.theme)
  const initial = book.creator_name?.[0]?.toUpperCase() || 'R'
  const formattedDate = book.created_at
    ? new Date(book.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently'

  const rating = (4.2 + ((book.id.charCodeAt(0) % 8) * 0.1)).toFixed(1)

  return (
    <div className="pb-detail-panel visible">
      {/* 3D Book cover */}
      <div className="pb-detail-book-wrap">
        <div className="pb-detail-book">
          <div className="pb-detail-book-spine" />
          {book.cover_media_url ? (
            <img
              src={book.cover_media_url}
              alt={book.title}
              className="pb-detail-book-cover"
            />
          ) : (
            <div className="pb-detail-book-cover-placeholder">{emoji}</div>
          )}
          <div className="pb-detail-book-pages" />
        </div>
      </div>

      {/* Title */}
      <div className="pb-detail-title">{book.title}</div>

      {/* Creator row + follow */}
      <div className="pb-detail-creator">
        <div className="pb-detail-avatar">{initial}</div>
        <div className="pb-detail-creator-name">by {book.creator_name}</div>
      </div>

      {/* Like button */}
      <LikeButton storyId={book.id} initialCount={book.like_count} />

      <div className="pb-detail-stats-row">
        <div className="pb-detail-rating">
          ⭐ {rating}
          <span className="pb-detail-rating-count">· Story</span>
        </div>
      </div>

      <div className="pb-detail-divider" />

      {/* Badges */}
      <div className="pb-detail-badges">
        <div className="pb-detail-badge">{emoji} {book.theme || 'Adventure'}</div>
        <div className="pb-detail-badge">📚 Grade {book.grade_level}</div>
        <div className="pb-detail-badge">🎨 {book.art_style || 'Cartoon'}</div>
      </div>

      {/* Meta */}
      <div className="pb-detail-meta">
        <div className="pb-detail-meta-item">
          <div className="pb-detail-meta-label">Length</div>
          <div className="pb-detail-meta-value">📖 5 Pages</div>
        </div>
        <div className="pb-detail-meta-item">
          <div className="pb-detail-meta-label">Created</div>
          <div className="pb-detail-meta-value">📅 {formattedDate}</div>
        </div>
      </div>

      <div className="pb-detail-divider" />

      {/* CTAs */}
      <div className="pb-detail-ctas">
        {isLoggedIn ? (
          <>
            {/* Primary: Add to Library or Read Now */}
            {saved ? (
              <button
                className="pb-btn-cta"
                id="btn-read-community-book"
                onClick={() => navigate(`/read/${book.id}`, { state: { fromBooks: true } })}
              >
                📖 Read Now →
              </button>
            ) : (
              <button
                className="pb-btn-cta pb-btn-save"
                id="btn-save-community-book"
                disabled={saving}
                onClick={toggle}
              >
                {saving ? '⏳ Saving…' : '📚 Add to Library'}
              </button>
            )}
            {/* Secondary: remove from library if saved */}
            {saved && (
              <button
                className="pb-btn-outline-cta"
                disabled={saving}
                onClick={toggle}
              >
                {saving ? '⏳…' : '✕ Remove from Library'}
              </button>
            )}
          </>
        ) : (
          <button className="pb-btn-cta" onClick={() => navigate('/signup')}>
            Sign Up to Read This Story →
          </button>
        )}
        <button className="pb-btn-outline-cta" onClick={onClose}>
          Browse More Books
        </button>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────
export default function PublicBookList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const targetId = searchParams.get('id')           // book to auto-select
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const didAutoSelect = useRef(false)

  const [books, setBooks] = useState<PublicBook[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<PublicBook | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [page, setPage] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const LIMIT = 24

  // Check auth session — determines CTA buttons
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
      // studentId comes from localStorage (set when a child profile is active)
      setStudentId(localStorage.getItem('readquest_student_id'))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsLoggedIn(!!session)
      setStudentId(localStorage.getItem('readquest_student_id'))
    })
    return () => subscription.unsubscribe()
  }, [])

  const fetchBooks = useCallback(async (reset = false) => {
    setLoading(true)
    try {
      const offset = reset ? 0 : page * LIMIT
      const res = await storiesApi.publicList({
        limit: LIMIT,
        offset,
        search: search || undefined,
        type: filter !== 'all' ? filter : undefined,
      })
      const data = res.data
      if (reset) {
        const sorted = (data.books as PublicBook[]).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        setBooks(sorted)
        setPage(0)
        // Auto-select from URL param once
        if (!didAutoSelect.current && targetId) {
          const match = sorted.find(b => b.id === targetId)
          if (match) {
            setSelectedBook(match)
            didAutoSelect.current = true
            // Scroll after paint
            setTimeout(() => {
              cardRefs.current[targetId]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }, 120)
          } else {
            setSelectedBook(sorted[0])
          }
        } else if (sorted.length > 0) {
          setSelectedBook(sorted[0])
        }
      } else {
        setBooks(prev => [...prev, ...data.books as PublicBook[]])
      }
      setTotal(data.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [filter, search, page, targetId])

  useEffect(() => { fetchBooks(true) }, [filter, search])

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
  }, [searchInput])

  const handleLoadMore = useCallback(async () => {
    const nextPage = page + 1
    setPage(nextPage)
    setLoading(true)
    try {
      const res = await storiesApi.publicList({
        limit: LIMIT,
        offset: nextPage * LIMIT,
        search: search || undefined,
        type: filter !== 'all' ? filter : undefined,
      })
      const data = res.data
      setBooks(prev => [...prev, ...data.books as PublicBook[]])
      setTotal(data.total)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, filter, search])

  const hasMore = books.length < total

  return (
    <div className="pb-root">
      {/* Nav */}
      <nav className="pb-nav">
        <div className="pb-nav-inner">
          <a href="/" className="pb-nav-logo">
            <span className="pb-logo-icon">📚</span>
            <span className="pb-logo-text">ReadQuest</span>
          </a>
          <form className="pb-nav-search" onSubmit={handleSearch}>
            <span className="pb-nav-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search books by title or theme…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
          </form>
          <div className="pb-nav-actions">
            {isLoggedIn ? (
              <a href="/dashboard" className="pb-btn-primary">🏠 Dashboard</a>
            ) : (
              <>
                <a href="/login" className="pb-btn-ghost">Log in</a>
                <a href="/signup" className="pb-btn-primary">Sign up free</a>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Filter bar */}
      <div className="pb-filter-bar">
        <span className="pb-filter-label">Type:</span>
        <div className="pb-filter-pills">
          {FILTER_TYPES.map(f => (
            <button
              key={f.value}
              className={`pb-filter-pill${filter === f.value ? ' active' : ''}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="pb-filter-count">{total} book{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Main layout */}
      <div className="pb-main">
        {/* Left — grid */}
        <div className="pb-grid-panel">
          <div className="pb-grid-header">
            <div className="pb-grid-title">Kids Book Creations ✨</div>
            <div className="pb-grid-sub">Browse books made by real kids — click to preview</div>
          </div>

          <div className="pb-book-grid">
            {loading && books.length === 0 ? (
              <SkeletonCards />
            ) : books.length === 0 ? (
              <div className="pb-empty">
                <div className="pb-empty-icon">📭</div>
                <div className="pb-empty-msg">No books found</div>
                <div className="pb-empty-sub">Try a different search or filter</div>
              </div>
            ) : (
              books.map(book => (
                <div
                  key={book.id}
                  ref={el => { cardRefs.current[book.id] = el }}
                  className={targetId === book.id ? 'pb-card-target-highlight' : ''}
                >
                  <BookCard
                    book={book}
                    selected={selectedBook?.id === book.id}
                    onClick={() => setSelectedBook(book)}
                  />
                </div>
              ))
            )}
          </div>

          {hasMore && (
            <div className="pb-load-more-wrap">
              <button
                className="pb-btn-load-more"
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading ? '⏳ Loading…' : 'Show More Books'}
              </button>
            </div>
          )}
        </div>

        {/* Right — detail sidebar */}
        <DetailSidebar book={selectedBook} onClose={() => setSelectedBook(null)} isLoggedIn={isLoggedIn} studentId={studentId} />
      </div>

      {/* Footer */}
      <footer className="pb-footer">
        <div className="pb-footer-brand">© 2025 ReadQuest · Made for young readers</div>
        <div className="pb-footer-links">
          <a href="/signup">Create your own story!</a>
          <a href="#privacy">Privacy</a>
        </div>
      </footer>
    </div>
  )
}
