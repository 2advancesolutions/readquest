import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/admin.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────────────────────
interface AdminStats { total_users: number; total_books: number; total_exams: number; total_xp: number }
interface AdminUser {
  id: string; name: string; grade_level: number; grade_label: string;
  school: string | null; avatar_url: string | null; created_at: string;
  total_xp: number; level: number; level_name: string;
  story_count: number; exam_count: number;
}
interface AdminBook {
  id: string; title: string; theme: string; grade_level: number; grade_label: string;
  cover_media_url: string | null; student_id: string; student_name: string;
  created_at: string; page_count: number;
}
interface AdminScore {
  id: string; student_id: string; student_name: string;
  grade_level: number; grade_label: string;
  section: string; section_label: string; is_practice: boolean;
  score_pct: number; correct_count: number; total_questions: number;
  passed: boolean; xp_earned: number; time_taken_sec: number | null;
  completed_at: string;
}

type Tab = 'users' | 'books' | 'scores'

interface DeleteTarget { id: string; title: string }

// ── Helpers ────────────────────────────────────────────────────────────────
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
  ]
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return colors[h % colors.length]
}
function scoreColor(pct: number): string {
  if (pct >= 90) return '#4ade80'
  if (pct >= 80) return '#a3e635'
  if (pct >= 60) return '#facc15'
  return '#f87171'
}
function fmtTime(sec: number | null): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60), s = sec % 60
  return `${m}m ${s}s`
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return iso }
}
function fmtNum(n: number): string {
  return n.toLocaleString()
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('users')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [books, setBooks] = useState<AdminBook[]>([])
  const [scores, setScores] = useState<AdminScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchAll = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const [statsRes, usersRes, booksRes, scoresRes] = await Promise.all([
        fetch(`${API}/api/admin/stats`),
        fetch(`${API}/api/admin/users`),
        fetch(`${API}/api/admin/books`),
        fetch(`${API}/api/admin/scores`),
      ])
      if (!statsRes.ok || !usersRes.ok || !booksRes.ok || !scoresRes.ok)
        throw new Error('Failed to load admin data')
      const [s, u, b, sc] = await Promise.all([
        statsRes.json(), usersRes.json(), booksRes.json(), scoresRes.json(),
      ])
      setStats(s); setUsers(u); setBooks(b); setScores(sc)
    } catch (e: any) {
      setError('Could not load admin data. Make sure the backend is running.')
    } finally {
      setLoading(false); setRefreshing(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const handleDeleteBook = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`${API}/api/admin/books/${deleteTarget.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setBooks(prev => prev.filter(b => b.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      alert('Failed to delete book. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  // Search-filtered lists
  const filteredUsers = useMemo(() =>
    users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) ||
      (u.school ?? '').toLowerCase().includes(search.toLowerCase())),
    [users, search])

  const filteredBooks = useMemo(() =>
    books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.student_name.toLowerCase().includes(search.toLowerCase()) ||
      b.theme.toLowerCase().includes(search.toLowerCase())),
    [books, search])

  const filteredScores = useMemo(() =>
    scores.filter(s => s.student_name.toLowerCase().includes(search.toLowerCase()) ||
      s.section_label.toLowerCase().includes(search.toLowerCase())),
    [scores, search])

  const currentCount = tab === 'users' ? filteredUsers.length
    : tab === 'books' ? filteredBooks.length
    : filteredScores.length

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="adm-root">
      {/* Header */}
      <div className="adm-header">
        <button className="adm-back-btn" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="adm-title-wrap">
          <h1 className="adm-title">⚙️ Admin Dashboard</h1>
          <p className="adm-subtitle">ReadQuest platform overview — all users, books & test scores</p>
        </div>
        <button
          className="adm-refresh-btn"
          onClick={() => fetchAll(true)}
          disabled={refreshing}
        >
          {refreshing ? '⟳ Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="adm-stats-row">
          {[
            { icon: '👥', value: fmtNum(stats.total_users), label: 'Total Students', cls: 'purple' },
            { icon: '📚', value: fmtNum(stats.total_books), label: 'Books Created', cls: 'blue' },
            { icon: '📝', value: fmtNum(stats.total_exams), label: 'Exams Taken', cls: 'green' },
            { icon: '⚡', value: fmtNum(stats.total_xp), label: 'Total XP Earned', cls: 'gold' },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              className={`adm-stat-card ${card.cls}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 260 }}
            >
              <span className="adm-stat-icon">{card.icon}</span>
              <span className="adm-stat-value">{card.value}</span>
              <span className="adm-stat-label">{card.label}</span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="adm-tabs">
        {([
          { key: 'users', icon: '👥', label: 'Students', count: users.length },
          { key: 'books', icon: '📚', label: 'Books', count: books.length },
          { key: 'scores', icon: '📝', label: 'Test Scores', count: scores.length },
        ] as const).map(t => (
          <button
            key={t.key}
            className={`adm-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => { setTab(t.key); setSearch('') }}
          >
            {t.icon} {t.label}
            <span className="adm-tab-count">{t.count}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="adm-toolbar">
        <div className="adm-search-wrap">
          <span className="adm-search-icon">🔍</span>
          <input
            className="adm-search"
            type="text"
            placeholder={
              tab === 'users' ? 'Search students by name or school…'
              : tab === 'books' ? 'Search by title, student, or theme…'
              : 'Search by student or section…'
            }
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="adm-count-badge">{currentCount} result{currentCount !== 1 ? 's' : ''}</span>
      </div>

      {/* Content */}
      <div className="adm-table-wrap">
        {loading && (
          <div className="adm-loading">
            <div className="adm-spinner" />
            <span>Loading admin data…</span>
          </div>
        )}

        {error && <div className="adm-error">⚠️ {error}</div>}

        {!loading && !error && (
          <AnimatePresence mode="wait">
            {/* ── Users Tab ─────────────────────────────────────── */}
            {tab === 'users' && (
              <motion.div
                key="users"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {filteredUsers.length === 0 ? (
                  <div className="adm-empty">No students found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Grade</th>
                        <th>Level</th>
                        <th>XP</th>
                        <th>Books</th>
                        <th>Exams</th>
                        <th>School</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((u, i) => (
                        <motion.tr
                          key={u.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        >
                          <td>
                            <div className="adm-cell-user">
                              <div className="adm-avatar" style={{ background: u.avatar_url ? 'transparent' : getAvatarBg(u.name) }}>
                                {u.avatar_url ? <img src={u.avatar_url} alt={u.name} /> : getInitials(u.name)}
                              </div>
                              <div>
                                <div className="adm-cell-name">{u.name}</div>
                                <div className="adm-cell-sub">{u.id.slice(0, 8)}…</div>
                              </div>
                            </div>
                          </td>
                          <td><span className="adm-grade-pill">Grade {u.grade_label}</span></td>
                          <td style={{ fontSize: '0.85rem', color: '#c4b5fd', fontWeight: 700 }}>{u.level_name}</td>
                          <td><span className="adm-xp">⚡ {fmtNum(u.total_xp)}</span></td>
                          <td style={{ color: '#93c5fd', fontWeight: 700 }}>📚 {u.story_count}</td>
                          <td style={{ color: '#6ee7b7', fontWeight: 700 }}>📝 {u.exam_count}</td>
                          <td style={{ color: 'rgba(204,195,216,0.55)', fontSize: '0.83rem' }}>{u.school || '—'}</td>
                          <td style={{ color: 'rgba(204,195,216,0.4)', fontSize: '0.82rem' }}>{fmtDate(u.created_at)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}

            {/* ── Books Tab ─────────────────────────────────────── */}
            {tab === 'books' && (
              <motion.div
                key="books"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {filteredBooks.length === 0 ? (
                  <div className="adm-empty">No books found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Book</th>
                        <th>Theme</th>
                        <th>Grade</th>
                        <th>Pages</th>
                        <th>Student</th>
                        <th>Created</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBooks.map((b, i) => (
                        <motion.tr
                          key={b.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        >
                          <td>
                            <div className="adm-cell-user">
                              {b.cover_media_url
                                ? <img className="adm-book-cover" src={b.cover_media_url} alt={b.title} />
                                : <div className="adm-book-cover-placeholder">📖</div>
                              }
                              <div>
                                <div className="adm-cell-name">{b.title}</div>
                                <div className="adm-cell-sub">{b.id.slice(0, 8)}…</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(204,195,216,0.65)', fontSize: '0.85rem' }}>
                            {b.theme}
                          </td>
                          <td><span className="adm-grade-pill">Grade {b.grade_label}</span></td>
                          <td style={{ color: '#93c5fd', fontWeight: 700 }}>{b.page_count}</td>
                          <td>
                            <div>
                              <div style={{ fontWeight: 700, color: '#f0eaff', fontSize: '0.88rem' }}>{b.student_name}</div>
                            </div>
                          </td>
                          <td style={{ color: 'rgba(204,195,216,0.4)', fontSize: '0.82rem' }}>{fmtDate(b.created_at)}</td>
                          <td>
                            <button
                              className="adm-delete-btn"
                              onClick={() => setDeleteTarget({ id: b.id, title: b.title })}
                              title="Delete book"
                            >
                              🗑️ Delete
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}

            {/* ── Scores Tab ────────────────────────────────────── */}
            {tab === 'scores' && (
              <motion.div
                key="scores"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {filteredScores.length === 0 ? (
                  <div className="adm-empty">No test scores found.</div>
                ) : (
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Section</th>
                        <th>Grade</th>
                        <th>Score</th>
                        <th>Result</th>
                        <th>XP</th>
                        <th>Time</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredScores.map((s, i) => (
                        <motion.tr
                          key={s.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i * 0.015, 0.3) }}
                        >
                          <td>
                            <div>
                              <div className="adm-cell-name">{s.student_name}</div>
                            </div>
                          </td>
                          <td style={{ fontSize: '0.83rem', color: 'rgba(204,195,216,0.7)', fontWeight: 600 }}>
                            {s.section_label}
                          </td>
                          <td><span className="adm-grade-pill">Grade {s.grade_label}</span></td>
                          <td>
                            <div className="adm-score-bar-wrap">
                              <div className="adm-score-bar-track">
                                <div
                                  className="adm-score-bar-fill"
                                  style={{ width: `${s.score_pct}%`, background: scoreColor(s.score_pct) }}
                                />
                              </div>
                              <span className="adm-score-num" style={{ color: scoreColor(s.score_pct) }}>
                                {s.score_pct.toFixed(0)}%
                              </span>
                            </div>
                          </td>
                          <td>
                            {s.is_practice ? (
                              <span className="adm-badge-pass practice">Practice</span>
                            ) : s.passed ? (
                              <span className="adm-badge-pass pass">✓ Pass</span>
                            ) : (
                              <span className="adm-badge-pass fail">✗ Fail</span>
                            )}
                          </td>
                          <td><span className="adm-xp">⚡ {s.xp_earned}</span></td>
                          <td style={{ color: 'rgba(204,195,216,0.5)', fontSize: '0.82rem' }}>{fmtTime(s.time_taken_sec)}</td>
                          <td style={{ color: 'rgba(204,195,216,0.4)', fontSize: '0.82rem' }}>{fmtDate(s.completed_at)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="adm-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeleteTarget(null)}
          >
            <motion.div
              className="adm-modal"
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              transition={{ type: 'spring', stiffness: 320, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="adm-modal-icon">🗑️</div>
              <div className="adm-modal-title">Delete Book?</div>
              <div className="adm-modal-msg">
                Are you sure you want to permanently delete
                <strong> "{deleteTarget.title}"</strong>?<br />
                This will remove all pages and vote data.
                <span style={{ color: '#f87171' }}> This cannot be undone.</span>
              </div>
              <div className="adm-modal-actions">
                <button
                  className="adm-modal-cancel"
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="adm-modal-confirm"
                  onClick={handleDeleteBook}
                  disabled={deleting}
                >
                  {deleting ? '⏳ Deleting…' : '🗑️ Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
