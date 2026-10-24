import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SignIn() {
  const { signIn } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      const data = await signIn(form.email, form.password);
      success(data.message || 'Signed in!');
      navigate(location.state?.from || '/');
    } catch (err) {
      setMessage(err.message);
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page narrow auth-page">
      <div className="card form-card auth-card">
        <span className="brand-mark large">B</span>
        <h1>Welcome back</h1>
        <p className="auth-sub">Sign in to save styles and upload your own.</p>

        <button type="button" className="demo-hint" onClick={() => setForm({ email: 'demo@buranga.app', password: 'demo1234' })}>
          Use demo account (demo@buranga.app / demo1234)
        </button>

        <form onSubmit={submit}>
          <label className="form-field">
            <span>Email address</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required autoComplete="email" />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Your password" required autoComplete="current-password" />
          </label>
          {message && <p className="form-error">{message}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="auth-links-row">
          <Link to="/forgot-password">Forgot password?</Link>
          <span>New here? <Link to="/signup">Create an account</Link></span>
        </div>
      </div>
    </div>
  );
}
