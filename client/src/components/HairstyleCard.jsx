import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { api, imageUrl } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import ImagePlaceholder from './ImagePlaceholder.jsx';

export default function HairstyleCard({ item, onUnsave }) {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [saved, setSaved] = useState(Boolean(item.isFavorite));
  const [saves, setSaves] = useState(item.savesCount || 0);
  const [failed, setFailed] = useState(false);

  const showPhoto = Boolean(item.imageUrl) && !failed;

  const toggleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      info('Sign in to save hairstyles to your collection.');
      navigate('/signin', { state: { from: location.pathname } });
      return;
    }
    try {
      if (saved) {
        await api.delete(`/api/favorites/${item.id}`);
        setSaved(false);
        setSaves((n) => Math.max(0, n - 1));
        success('Removed from saved styles.');
        if (onUnsave) onUnsave(item.id);
      } else {
        const data = await api.post(`/api/favorites/${item.id}`);
        setSaved(true);
        setSaves(data.savesCount ?? saves + 1);
        success('Saved to your collection!');
      }
    } catch (err) {
      error(err.message);
    }
  };

  return (
    <article className="pin-card">
      <Link to={`/hairstyles/${item.id}`} className="pin-image-link">
        <div className="pin-image-wrap" style={{ aspectRatio: item.aspectRatio || 0.75 }}>
          {showPhoto ? (
            <img
              src={imageUrl(item.imageUrl)}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onError={() => setFailed(true)}
            />
          ) : (
            <ImagePlaceholder label="Photo unavailable" />
          )}
          <div className="pin-overlay">
            <button
              className={`save-pill${saved ? ' saved' : ''}`}
              onClick={toggleSave}
              type="button"
            >
              {saved ? 'Saved ✓' : 'Save'}
            </button>
          </div>
        </div>
      </Link>
      <div className="pin-body">
        <Link to={`/hairstyles/${item.id}`} className="pin-title">{item.title}</Link>
        <p className="pin-desc">{item.description}</p>
        <div className="pin-meta">
          <Link to={`/categories/${encodeURIComponent(item.category)}`} className="pin-category">
            {item.category}
          </Link>
          <span className="pin-saves" title="Saves"> {saves}</span>
        </div>
      </div>
    </article>
  );
}
