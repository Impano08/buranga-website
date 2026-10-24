import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function SignUp() {
  const { signUp } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await signUp(form);
      success(data.message || 'Account created!');
      navigate('/');
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
        <h1>Join BURANGA</h1>
        <p className="auth-sub">Create an account to save styles and share your own.</p>

        <form onSubmit={submit}>
          <label className="form-field">
            <span>Full name</span>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" required minLength={2} autoComplete="name" />
          </label>
          <label className="form-field">
            <span>Email address</span>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required autoComplete="email" />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters, with a number" required autoComplete="new-password" />
          </label>
          <label className="form-field">
            <span>Confirm password</span>
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} placeholder="Repeat your password" required autoComplete="new-password" />
          </label>
          {message && <p className="form-error">{message}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div className="auth-links-row">
          <span>Already have an account? <Link to="/signin">Sign in</Link></span>
        </div>
      </div>
    </div>
  );
}
