import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CharacterHero, { CHARACTERS, SESSION_IDX } from '../components/CharacterHero';
import '../styles/auth.css';
import '../styles/signup-wizard.css';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Child {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  school: string;
}

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

const GRADE_EMOJIS: Record<string, string> = {
  K: '🌱', '1': '⭐', '2': '🚀', '3': '📚',
  '4': '🔬', '5': '🌍', '6': '🎯', '7': '💡', '8': '🏆',
};

const newChild = (): Child => ({
  id: Math.random().toString(36).slice(2),
  firstName: '',
  lastName: '',
  grade: '1',
  school: '',
});

// ─── Component ────────────────────────────────────────────────────────────────
const Signup = () => {
  const navigate = useNavigate();

  // Step state
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Parent
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 — Children
  const [children, setChildren] = useState<Child[]>([newChild()]);

  // Shared
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Keep parentId in a ref so step 2 can always access it
  // even before the Supabase session fully propagates
  const parentIdRef = useRef<string | null>(null);

  // ── Step 1 submit: create parent auth account ────────────────────────────
  const handleParentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: firstName, last_name: lastName } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) {
        // Email confirmation required — can't add children until verified
        setStep(3);
        return;
      }

      // Store parentId in ref so step 2 always has it
      parentIdRef.current = userId;

      // Register parent in backend
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/parents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, first_name: firstName, last_name: lastName }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error('Parent registration failed:', res.status, body);
        }
      } catch (backendErr) {
        console.error('Backend parent registration network error:', backendErr);
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2 submit: save all children ────────────────────────────────────
  const handleChildrenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use the ref first (set in step 1), then fall back to live session
      let parentId = parentIdRef.current;
      if (!parentId) {
        const { data: { session } } = await supabase.auth.getSession();
        const { data: { user } } = await supabase.auth.getUser();
        parentId = session?.user?.id ?? user?.id ?? null;
      }
      if (!parentId) throw new Error('Could not identify your account. Please log in and try again.');

      const results = await Promise.all(
        children.map((child) =>
          fetch(`${import.meta.env.VITE_API_URL}/api/students`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parent_id: parentId,
              name: `${child.firstName} ${child.lastName}`.trim(),
              grade_level: child.grade === 'K' ? 0 : parseInt(child.grade),
              school: child.school || null,
            }),
          })
        )
      );

      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        const body = await failed[0].text();
        throw new Error(`Failed to save ${failed.length} child(ren): ${body}`);
      }

      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Error saving children');
    } finally {
      setLoading(false);
    }
  };

  // ── Child list helpers ───────────────────────────────────────────────────
  const updateChild = (id: string, field: keyof Child, value: string) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const addChild = () => setChildren((prev) => [...prev, newChild()]);

  const removeChild = (id: string) => {
    if (children.length === 1) return;
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Renders
  // ═══════════════════════════════════════════════════════════════════════════

  const StepIndicator = () => (
    <div className="sw-steps">
      {[
        { n: 1, label: 'Your Account' },
        { n: 2, label: 'Add Children' },
        { n: 3, label: "All Set!" },
      ].map(({ n, label }, i) => (
        <React.Fragment key={n}>
          <div className={`sw-step ${step === n ? 'active' : ''} ${step > n ? 'done' : ''}`}>
            <div className="sw-step-bubble">
              {step > n ? '✓' : n}
            </div>
            <span className="sw-step-label">{label}</span>
          </div>
          {i < 2 && <div className={`sw-step-line ${step > n ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  // ── Step 1 ───────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="auth-root">
        <CharacterHero />
        <div className="auth-form-side">
          <div className="auth-card sw-wide">
            <div className="auth-mascot">{CHARACTERS[SESSION_IDX].emoji}</div>
            <div className="auth-logo" onClick={() => navigate('/')}>ReadQuest <span>✨</span></div>
            <StepIndicator />

            <h1 className="auth-title">Create Your Account</h1>
            <p className="auth-sub">Already have one? <Link to="/login" className="auth-link">Log in</Link></p>

            <form className="auth-form" onSubmit={handleParentSubmit}>
              {error && <div className="auth-error">⚠️ {error}</div>}

              <div className="auth-row">
                <div className="auth-field">
                  <label className="auth-label">First Name</label>
                  <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                    className="auth-input" placeholder="Jane" />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Last Name</label>
                  <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)}
                    className="auth-input" placeholder="Doe" />
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label">Email Address</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="auth-input" placeholder="jane@example.com" />
              </div>

              <div className="auth-field">
                <label className="auth-label">Password</label>
                <div className="sw-password-wrap">
                  <input required type={showPassword ? 'text' : 'password'} value={password}
                    onChange={e => setPassword(e.target.value)} className="auth-input" placeholder="Min. 8 characters"
                    minLength={8} />
                  <button type="button" className="sw-eye-btn" onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : null}
                {loading ? 'Creating account…' : 'Continue → Add Children'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2 ───────────────────────────────────────────────────────────────
  if (step === 2) {
    return (
      <div className="auth-root">
        <CharacterHero />
        <div className="auth-form-side">
          <div className="auth-card sw-wide">
            <div className="auth-mascot">{CHARACTERS[SESSION_IDX].emoji}</div>
            <div className="auth-logo" onClick={() => navigate('/')}>ReadQuest <span>✨</span></div>
            <StepIndicator />

            <h1 className="auth-title">Add Your Children</h1>
            <p className="auth-sub">Reading adapts automatically to each child's grade level</p>

            <form className="auth-form" onSubmit={handleChildrenSubmit}>
              {error && <div className="auth-error">⚠️ {error}</div>}

              <div className="sw-children-list">
                {children.map((child, idx) => (
                  <div key={child.id} className="sw-child-card">
                    <div className="sw-child-header">
                      <span className="sw-child-badge">
                        {GRADE_EMOJIS[child.grade] || '📚'} Child {idx + 1}
                      </span>
                      {children.length > 1 && (
                        <button type="button" className="sw-remove-btn" onClick={() => removeChild(child.id)}>
                          ✕ Remove
                        </button>
                      )}
                    </div>

                    <div className="auth-row">
                      <div className="auth-field">
                        <label className="auth-label">First Name</label>
                        <input required type="text" value={child.firstName}
                          onChange={e => updateChild(child.id, 'firstName', e.target.value)}
                          className="auth-input" placeholder="Alex" />
                      </div>
                      <div className="auth-field">
                        <label className="auth-label">Last Name</label>
                        <input required type="text" value={child.lastName}
                          onChange={e => updateChild(child.id, 'lastName', e.target.value)}
                          className="auth-input" placeholder="Doe" />
                      </div>
                    </div>

                    <div className="auth-row">
                      <div className="auth-field">
                        <label className="auth-label">Grade Level</label>
                        <select value={child.grade}
                          onChange={e => updateChild(child.id, 'grade', e.target.value)}
                          className="auth-input sw-select">
                          {GRADES.map(g => (
                            <option key={g.value} value={g.value}>{g.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="auth-field">
                        <label className="auth-label">School <span className="sw-optional">(optional)</span></label>
                        <input type="text" value={child.school}
                          onChange={e => updateChild(child.id, 'school', e.target.value)}
                          className="auth-input" placeholder="Lincoln Elementary" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className="sw-add-child-btn" onClick={addChild}>
                <span className="sw-plus">＋</span> Add Another Child
              </button>

              <div className="sw-action-row">
                <button type="button" className="sw-skip-btn" onClick={() => setStep(3)}>
                  Skip for now
                </button>
                <button type="submit" className="auth-btn sw-finish-btn" disabled={loading}>
                  {loading ? <span className="auth-spinner" /> : null}
                  {loading ? 'Saving…' : `Save ${children.length > 1 ? `${children.length} Children` : 'Child'} →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3 — Success ─────────────────────────────────────────────────────
  return (
    <div className="auth-root">
      <CharacterHero />
      <div className="auth-form-side">
        <div className="auth-card sw-wide" style={{ textAlign: 'center' }}>
          <div className="auth-mascot">{CHARACTERS[SESSION_IDX].emoji}</div>
          <div className="auth-logo" onClick={() => navigate('/')}>ReadQuest <span>✨</span></div>
          <StepIndicator />
          <div className="sw-success-icon">🎉</div>
          <h1 className="auth-title">You're all set!</h1>
          <p className="auth-sub" style={{ maxWidth: 300, margin: '0 auto 32px' }}>
            {children.length > 0 && children[0].firstName
              ? `${children.map(c => c.firstName).join(', ')} ${children.length > 1 ? 'are' : 'is'} ready to read!`
              : 'Your account is ready. Add children anytime from the dashboard.'}
          </p>
          <button className="auth-btn" onClick={() => navigate('/dashboard')}>
            Go to Dashboard 🚀
          </button>
        </div>
      </div>
    </div>
  );
};

export default Signup;
