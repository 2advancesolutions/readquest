import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import '../styles/app-shell.css';
import '../styles/design-tokens.css';

const GRADES = [
  { value: 'K', label: 'Kindergarten' },
  { value: '1', label: '1st Grade' },
  { value: '2', label: '2nd Grade' },
  { value: '3', label: '3rd Grade' },
  { value: '4', label: '4th Grade' },
  { value: '5', label: '5th Grade' },
  { value: '6', label: '6th Grade' },
  { value: '7', label: '7th Grade' },
  { value: '8', label: '8th Grade' },
];

const AVATAR_COLORS = [
  '#702AE1', '#10B981', '#3B82F6', '#EC4899',
  '#F97316', '#06B6D4', '#8B5CF6', '#EF4444',
];

interface ExistingChild {
  id: string;
  name: string;
  grade_level: number;
  school?: string;
}

/* ── Sidebar ─────────────────────────────────────────────────────── */
function AppSidebar({ active }: { active: string }) {
  const navigate = useNavigate();
  const handleLogout = useCallback(() => {
    localStorage.clear();
    supabase.auth.signOut();
    navigate('/');
  }, [navigate]);

  const links = [
    { key: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
    { key: 'rewards', label: 'Progress & Metrics', path: '/rewards', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
    { key: 'shelf', label: 'Reading Shelf', path: '/shelf', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
    { key: 'generate', label: 'Generate Story', path: '/generate', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> },
    { key: 'kids', label: 'Manage Children', path: '/add-kid', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { key: 'profile', label: 'My Profile', path: '/profile', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  ];

  return (
    <aside className="app-sidebar">
      <div className="app-sidebar-logo" onClick={() => navigate('/dashboard')}>ReadQuest ✨</div>
      <nav className="app-sidebar-nav">
        {links.map(l => (
          <button key={l.key} className={`app-sidebar-link ${active === l.key ? 'active' : ''}`} onClick={() => navigate(l.path)}>
            {l.icon}<span>{l.label}</span>
          </button>
        ))}
      </nav>
      <div className="app-sidebar-bottom">
        <button className="app-sidebar-logout" onClick={handleLogout}><span>Log out</span></button>
      </div>
    </aside>
  );
}

/* ── Main ─────────────────────────────────────────────────────────── */
const AddKid = () => {
  const navigate = useNavigate();
  const [parentId, setParentId] = useState<string | null>(null);
  const [existingChildren, setExistingChildren] = useState<ExistingChild[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('1');
  const [school, setSchool] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setParentId(session.user.id);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/students/parent/${session.user.id}`);
        if (res.ok) setExistingChildren(await res.json());
      } catch { /* non-fatal */ }
      setFetching(false);
    });
  }, [navigate]);

  const handleAddKid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentId) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_id: parentId,
          name: `${firstName} ${lastName}`.trim(),
          grade_level: grade === 'K' ? 0 : parseInt(grade),
          school: school || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to add child');
      const newChild: ExistingChild = await res.json();
      setExistingChildren(prev => [...prev, newChild]);
      setFirstName(''); setLastName(''); setGrade('1'); setSchool('');
      setSuccess(`${firstName} was added! 🎉`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      setError(err.message || 'Error adding child');
    } finally {
      setLoading(false);
    }
  };

  const gradeLabel = (gl: number) => {
    if (gl === 0) return 'Kindergarten';
    return GRADES.find(g => g.value === String(gl))?.label ?? `Grade ${gl}`;
  };

  return (
    <div className="app-shell">
      <AppSidebar active="kids" />

      <div className="app-content">
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #080418 0%, #110729 45%, #0d0520 100%)',
          padding: '48px 48px 80px',
          position: 'relative',
          overflow: 'hidden',
          color: 'rgba(233,221,255,0.9)',
        }}>
          {/* Background blobs */}
          <div style={{ position: 'absolute', top: -180, left: -120, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(124,58,237,0.05) 45%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -80, right: -60, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, rgba(112,42,225,0.06) 50%, transparent 70%)', pointerEvents: 'none' }} />

          {/* ── Page Header ── */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'rgba(233,221,255,0.95)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
              👧 Manage Children
            </h1>
            <p style={{ color: 'rgba(204,195,216,0.55)', fontSize: '1rem', margin: 0, fontWeight: 500 }}>
              Add or manage children linked to your account
            </p>
          </motion.div>

          {/* ── Your Children ── */}
          {fetching ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ height: 80, borderRadius: 24, background: 'linear-gradient(90deg, rgba(30,14,70,0.8) 25%, rgba(60,30,120,0.5) 50%, rgba(30,14,70,0.8) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', border: '1px solid rgba(150,110,255,0.1)' }} />
              ))}
            </div>
          ) : existingChildren.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ marginBottom: 40 }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(204,195,216,0.45)', marginBottom: 16 }}>
                Your Children
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {existingChildren.map((child, i) => (
                  <motion.div key={child.id}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.06 * i, type: 'spring', stiffness: 240, damping: 22 }}
                    style={{
                      background: 'rgba(20,10,50,0.7)',
                      backdropFilter: 'blur(12px)',
                      borderRadius: 24,
                      padding: '18px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 18,
                      border: '1px solid rgba(150,110,255,0.15)',
                      boxShadow: '0 4px 16px rgba(10,4,28,0.4)',
                    }}>
                    {/* Avatar */}
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                      background: AVATAR_COLORS[i % AVATAR_COLORS.length],
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.2rem', fontWeight: 800, color: '#fff',
                    }}>
                      {child.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '1rem', color: 'rgba(233,221,255,0.9)', marginBottom: 3 }}>{child.name}</div>
                      <div style={{ fontSize: '0.82rem', color: 'rgba(204,195,216,0.5)' }}>
                        {child.school || gradeLabel(child.grade_level)}
                      </div>
                    </div>

                    {/* Grade chip */}
                    <div style={{
                      background: 'rgba(124,58,237,0.2)', color: '#c084fc',
                      border: '1px solid rgba(192,132,252,0.25)',
                      borderRadius: 999, padding: '5px 14px',
                      fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {gradeLabel(child.grade_level)}
                    </div>

                    {/* Select button */}
                    <motion.button
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        localStorage.setItem('readquest_student_id', child.id);
                        localStorage.setItem('readquest_student_name', child.name);
                        navigate('/dashboard');
                      }}
                      style={{
                        background: 'rgba(124,58,237,0.15)', color: '#c084fc',
                        border: '1px solid rgba(192,132,252,0.2)', borderRadius: 999, padding: '9px 20px',
                        fontFamily: 'var(--font-body)', fontSize: '0.85rem', fontWeight: 700,
                        cursor: 'pointer', flexShrink: 0, transition: 'background 0.18s',
                      }}>
                      Select
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Add a Child Form ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: 'rgba(20,10,50,0.75)', backdropFilter: 'blur(16px)', border: '1px solid rgba(150,110,255,0.15)', borderRadius: 28, padding: '32px 32px 28px', boxShadow: '0 8px 32px rgba(10,4,28,0.4)' }}>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(204,195,216,0.45)', marginBottom: 24 }}>
              Add a Child
            </p>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(247,75,109,0.08)', borderRadius: 14, padding: '12px 18px', color: 'var(--rq-coral)', fontSize: '0.88rem', fontWeight: 600, marginBottom: 20 }}>
                  ❌ {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ background: 'rgba(0,116,57,0.08)', borderRadius: 14, padding: '12px 18px', color: '#007439', fontSize: '0.88rem', fontWeight: 600, marginBottom: 20 }}>
                  {success}
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleAddKid}>
              {/* Row 1 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={labelStyle}>First Name</label>
                  <input required value={firstName} onChange={e => setFirstName(e.target.value)}
                    style={inputStyle} placeholder="Alex" />
                </div>
                <div>
                  <label style={labelStyle}>Last Name</label>
                  <input required value={lastName} onChange={e => setLastName(e.target.value)}
                    style={inputStyle} placeholder="Johnson" />
                </div>
              </div>

              {/* Row 2 */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div>
                  <label style={labelStyle}>Grade Level</label>
                  <select value={grade} onChange={e => setGrade(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {GRADES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>School <span style={{ fontWeight: 400, opacity: 0.65 }}>(optional)</span></label>
                  <input value={school} onChange={e => setSchool(e.target.value)}
                    style={inputStyle} placeholder="Lincoln Elementary" />
                </div>
              </div>

              {/* CTA */}
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: loading ? 1 : 0.98 }}
                style={{
                  width: '100%',
                  padding: '15px 0',
                  background: 'linear-gradient(135deg, #702AE1, #6411D5)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  fontFamily: 'var(--font-body)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.72 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 8px 28px rgba(112,42,225,0.32)',
                  letterSpacing: '-0.01em',
                  transition: 'opacity 0.18s',
                }}>
                {loading ? (
                  <>
                    <svg style={{ width: 18, height: 18, animation: 'spin 0.8s linear infinite' }} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
                    </svg>
                    Adding…
                  </>
                ) : '+ Add Child'}
              </motion.button>
            </form>
          </motion.div>

          <style>{`
            @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
            @keyframes spin { to { transform: rotate(360deg); } }
            input:focus, select:focus { outline: none; border-color: rgba(192,132,252,0.5) !important; box-shadow: 0 0 0 3px rgba(112,42,225,0.2) !important; background: rgba(30,14,70,0.9) !important; }
          `}</style>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: 'rgba(204,195,216,0.55)',
  marginBottom: 8,
  letterSpacing: '0.01em',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 14,
  border: '1.5px solid rgba(150,110,255,0.2)',
  background: 'rgba(30,14,70,0.7)',
  fontFamily: 'var(--font-body)',
  fontSize: '0.95rem',
  fontWeight: 500,
  color: 'rgba(233,221,255,0.9)',
  boxSizing: 'border-box',
  transition: 'border-color 0.18s, box-shadow 0.18s, background 0.18s',
};

export default AddKid;
