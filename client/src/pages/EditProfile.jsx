import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function EditProfile() {
  const { user, updateUser } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await api.put('/api/auth/profile', form);
      updateUser(data.user);
      success('Profile updated!');
      navigate('/profile');
    } catch (err) {
      error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>Edit Profile</h1>
        <p>Update how you appear across BURANGA.</p>
      </div>
      <form className="card form-card" onSubmit={submit}>
        <div className="profile-avatar big">{user?.name?.charAt(0).toUpperCase()}</div>
        <label className="form-field">
          <span>Full name</span>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={2} />
        </label>
        <label className="form-field">
          <span>Bio</span>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} maxLength={300} placeholder="Tell the community about your hair journey…" />
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/profile')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
