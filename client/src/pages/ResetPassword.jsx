import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ResetPassword() {
  const { token } = useParams();
  const { refresh } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (form.password !== form.confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post('/api/auth/reset-password', { token, ...form });
      success(data.message);
      await refresh();
      navigate('/profile');
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
        <h1>Choose a new password</h1>
        <p className="auth-sub">Your new password must be at least 8 characters with a number.</p>
        <form onSubmit={submit}>
          <label className="form-field">
            <span>New password</span>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="new-password" />
          </label>
          <label className="form-field">
            <span>Confirm new password</span>
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required autoComplete="new-password" />
          </label>
          {message && <p className="form-error">{message}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Updating…' : 'Reset Password'}
          </button>
        </form>
        <div className="auth-links-row">
          <Link to="/signin">← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
