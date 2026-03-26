import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import '../styles/profile.css'
import '../styles/app-shell.css'

interface Child { id: string; name: string; grade_level: number }

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

const AVATAR_COLORS = [
  '#702AE1', '#10B981', '#3B82F6', '#EC4899',
  '#F97316', '#06B6D4', '#8B5CF6', '#EF4444',
]

/* ── Sidebar ─────────────────────────────────────────────────────── */
function AppSidebar({ active }: { active: string }) {
  const navigate = useNavigate()
  const handleLogout = useCallback(() => {
    localStorage.clear()
    supabase.auth.signOut()
    navigate('/')
  }, [navigate])

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo" onClick={() => navigate('/dashboard')}>ReadQuest ✨</div>
      <nav className="app-sidebar-nav">
        <button className={`app-sidebar-link ${active === 'dashboard' ? 'active' : ''}`} onClick={() => navigate('/dashboard')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          <span>Dashboard</span>
        </button>
        <button className={`app-sidebar-link ${active === 'rewards' ? 'active' : ''}`} onClick={() => navigate('/rewards')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span>Progress & Metrics</span>
        </button>
        <button className={`app-sidebar-link ${active === 'shelf' ? 'active' : ''}`} onClick={() => navigate('/shelf')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          <span>Reading Shelf</span>
        </button>
        <button className={`app-sidebar-link ${active === 'generate' ? 'active' : ''}`} onClick={() => navigate('/generate')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          <span>Generate Story</span>
        </button>
        <button className={`app-sidebar-link ${active === 'kids' ? 'active' : ''}`} onClick={() => navigate('/add-kid')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>Manage Children</span>
        </button>
        <button className={`app-sidebar-link ${active === 'profile' ? 'active' : ''}`} onClick={() => navigate('/profile')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span>My Profile</span>
        </button>
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-logout" onClick={handleLogout}><span>Log out</span></button>
      </div>
    </aside>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function Profile() {
  const navigate = useNavigate()
  const [email, setEmail]         = useState('')
  const [displayName, setDisplayName] = useState('')
  const [children, setChildren]   = useState<Child[]>([])
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return }

      const user = session.user
      setEmail(user.email ?? '')
      setDisplayName(user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '')

      // Fetch children
      fetch(`${API_BASE}/api/students/parent/${user.id}`)
        .then(r => r.json())
        .then((data: Child[]) => setChildren(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [navigate])

  const handleSaveProfile = async () => {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: displayName },
    })
    setSaving(false)
    if (error) showToast('❌ Failed to save. Try again.')
    else showToast('✅ Profile updated!')
  }

  const handleChangePassword = async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) showToast('❌ Could not send reset email.')
    else showToast('📧 Password reset email sent!')
  }

  const handleSignOut = useCallback(() => {
    localStorage.clear()
    supabase.auth.signOut()
    navigate('/')
  }, [navigate])

  const initials = displayName ? displayName.charAt(0).toUpperCase() : '?'
  const childCount = children.length

  return (
    <div className="app-shell">
      <AppSidebar active="profile" />

      <div className="app-content">
        <div className="profile-page">

          {/* ── Hero ── */}
          <motion.div className="profile-hero"
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}>
            <div className="profile-avatar">{initials}</div>
            <div className="profile-hero-text">
              <h1 className="profile-hero-name">
                {loading ? '…' : (displayName || 'Parent Account')}
              </h1>
              <p className="profile-hero-email">{email}</p>
              <div className="profile-hero-badge">
                👨‍👩‍👧 {childCount} {childCount === 1 ? 'Child' : 'Children'} registered
              </div>
            </div>
          </motion.div>

          <div className="profile-grid">

            {/* ── Account Details ── */}
            <motion.div className="profile-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}>
              <p className="profile-card-title">Account Details</p>

              <div className="profile-field">
                <label className="profile-label" htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  className="profile-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="profile-field">
                <label className="profile-label" htmlFor="email">Email Address</label>
                <input
                  id="email"
                  className="profile-input"
                  value={email}
                  disabled
                  placeholder="Email"
                />
              </div>

              <motion.button
                className="profile-save-btn"
                onClick={handleSaveProfile}
                disabled={saving || loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}>
                {saving ? '⏳ Saving…' : '💾 Save Changes'}
              </motion.button>
            </motion.div>

            {/* ── Security ── */}
            <motion.div className="profile-card"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}>
              <p className="profile-card-title">Security</p>

              <div className="profile-field">
                <label className="profile-label">Password</label>
                <input className="profile-input" type="password" value="••••••••••" disabled />
              </div>

              <motion.button
                className="profile-save-btn"
                onClick={handleChangePassword}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                style={{ background: 'linear-gradient(135deg, #3B82F6, #6366F1)' }}>
                📧 Send Password Reset
              </motion.button>
            </motion.div>

            {/* ── Children ── */}
            <motion.div className="profile-card profile-card-full"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}>
              <p className="profile-card-title">Registered Children</p>

              {loading ? (
                <div className="profile-children-list">
                  {[0, 1].map(i => (
                    <div key={i} className="profile-skeleton" style={{ height: 64, marginBottom: 10 }} />
                  ))}
                </div>
              ) : children.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: '24px 0', color: 'var(--rq-text-muted)', fontSize: '0.92rem' }}>
                  No children added yet. Add one to get started! 🧒
                </motion.div>
              ) : (
                <div className="profile-children-list">
                  {children.map((child, i) => (
                    <motion.div key={child.id} className="profile-child-row"
                      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}>
                      <div className="profile-child-avatar"
                        style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="profile-child-info">
                        <div className="profile-child-name">{child.name}</div>
                        <div className="profile-child-grade">Grade {child.grade_level}</div>
                      </div>
                      <div className="profile-child-chip">G{child.grade_level}</div>
                    </motion.div>
                  ))}
                </div>
              )}

              <button className="profile-add-child-btn" onClick={() => navigate('/add-kid')}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                Add another child
              </button>
            </motion.div>

            {/* ── Danger Zone ── */}
            <motion.div className="profile-card profile-card-full"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}>
              <p className="profile-card-title" style={{ color: 'var(--rq-coral)' }}>Danger Zone</p>
              <p style={{ fontSize: '0.88rem', color: 'var(--rq-text-muted)', marginBottom: 16 }}>
                Sign out from your account on this device.
              </p>
              <motion.button
                className="profile-danger-btn"
                onClick={handleSignOut}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}>
                🚪 Sign Out
              </motion.button>
            </motion.div>

          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div className="profile-toast"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
