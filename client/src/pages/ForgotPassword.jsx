import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function ForgotPassword() {
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data = await api.post('/api/auth/forgot-password', { email });
      setSent(true);
      setDevUrl(data.devResetUrl || '');
      success(data.message);
    } catch (err) {
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page narrow auth-page">
      <div className="card form-card auth-card">
        <h1>Forgot your password?</h1>
        <p className="auth-sub">Enter your email and we'll send you a reset link.</p>

        {sent ? (
          <div className="info-box">
            <p>If an account exists for <strong>{email}</strong>, a reset link has been sent.</p>
            {devUrl && (
              <>
                <p className="muted">Email service is not configured yet, so here is your reset link (development mode only):</p>
                <a href={devUrl} className="dev-link">{devUrl}</a>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="form-field">
              <span>Email address</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="auth-links-row">
          <Link to="/signin">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
