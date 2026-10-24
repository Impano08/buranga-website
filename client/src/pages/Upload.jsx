import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 8 * 1024 * 1024;

export default function Upload() {
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [meta, setMeta] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', tags: '', hairLength: 'Any', occasion: 'Everyday', hairType: 'Any' });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef();

  useEffect(() => {
    api.get('/api/hairstyles/meta').then(setMeta).catch(() => {});
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, []);

  const onFileChange = (e) => {
    const chosen = e.target.files?.[0];
    if (!chosen) return;
    if (!ALLOWED.includes(chosen.type)) {
      error('Please choose a JPG, PNG or WebP image.');
      e.target.value = '';
      return;
    }
    if (chosen.size > MAX_SIZE) {
      error('Image is too large. Maximum size is 8 MB.');
      e.target.value = '';
      return;
    }
    setFile(chosen);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(chosen));
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage('');
    if (!file) {
      error('Please choose a photo to upload.');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      const data = await api.postForm('/api/hairstyles', formData);
      success(data.message || 'Published!');
      navigate(`/hairstyles/${data.item.id}`);
    } catch (err) {
      setMessage(err.message);
      error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    setForm({ title: '', description: '', category: '', tags: '', hairLength: 'Any', occasion: 'Everyday', hairType: 'Any' });
    setFile(null);
    setPreview('');
    if (fileRef.current) fileRef.current.value = '';
    navigate('/');
  };

  return (
    <div className="page narrow">
      <div className="page-head">
        <h1>Share a Hairstyle</h1>
        <p>Upload a photo from your device and inspire the community.</p>
      </div>

      <form className="card form-card" onSubmit={submit}>
        <div className="upload-zone" onClick={() => fileRef.current?.click()}>
          {preview ? (
            <img src={preview} alt="Preview of your upload" className="upload-preview" />
          ) : (
            <div className="upload-placeholder">
              <span className="empty-icon">📸</span>
              <p>Click to choose a photo</p>
              <small>JPG, PNG or WebP · max 8 MB</small>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileChange} hidden />
        {file && <p className="file-name">Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}

        <label className="form-field">
          <span>Hairstyle title *</span>
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Textured Fade with Line-Up" required minLength={3} />
        </label>

        <label className="form-field">
          <span>Short description *</span>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the style, length, colour, why you love it…" rows={3} required minLength={10} />
        </label>

        <div className="form-row">
          <label className="form-field">
            <span>Category *</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
              <option value="">Choose a category…</option>
              {meta?.categories.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Hair length</span>
            <select value={form.hairLength} onChange={(e) => setForm({ ...form, hairLength: e.target.value })}>
              {meta?.hairLengths.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label className="form-field">
            <span>Occasion</span>
            <select value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })}>
              {meta?.occasions.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
          <label className="form-field">
            <span>Hair type</span>
            <select value={form.hairType} onChange={(e) => setForm({ ...form, hairType: e.target.value })}>
              {meta?.hairTypes.map((o) => <option key={o}>{o}</option>)}
            </select>
          </label>
        </div>

        <label className="form-field">
          <span>Tags (optional, comma separated)</span>
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="e.g. protective, beads, summer" />
        </label>

        {message && <p className="form-error">{message}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Publishing…' : 'Publish Hairstyle'}
          </button>
          <button type="button" className="btn btn-outline" onClick={cancel} disabled={submitting}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
