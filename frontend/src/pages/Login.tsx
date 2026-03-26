import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import '../styles/auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;
      // Persist user identity for Dashboard / API calls
      if (data.user) {
        localStorage.setItem('readquest_student_id', data.user.id);
        const meta = data.user.user_metadata;
        const displayName = [meta?.first_name, meta?.last_name].filter(Boolean).join(' ') || email;
        localStorage.setItem('readquest_student_name', displayName);
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error logging in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      {/* Left hero panel — visible desktop only via CSS */}
      <div className="auth-hero">
        <div className="auth-hero-emoji animate-float">🦉</div>
        <div className="auth-hero-title">ReadQuest ✨</div>
        <div className="auth-hero-sub">Where every child becomes a confident, joyful reader.</div>
        <div className="auth-hero-dots">
          <span /><span /><span /><span />
        </div>
      </div>

      {/* Right form side */}
      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mascot">🦉</div>
          <div className="auth-logo" onClick={() => navigate('/')}>ReadQuest <span>✨</span></div>
          <div className="auth-tagline">Your magical reading adventure awaits!</div>

          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-sub">No account? <Link to="/signup" className="auth-link">Create one →</Link></p>

          <form className="auth-form" onSubmit={handleLogin}>
            {error && <div className="auth-error">⚠️ {error}</div>}

            <div className="auth-field">
              <label className="auth-label">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="auth-input"
                placeholder="jane@example.com"
                id="login-email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">Password</label>
              <input
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="auth-input"
                placeholder="••••••••"
                id="login-password"
              />
            </div>

            <div className="auth-forgot">
              <a href="#">Forgot password?</a>
            </div>

            <button type="submit" className="auth-btn" disabled={loading} id="login-submit">
              {loading ? <span className="auth-spinner" /> : null}
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
