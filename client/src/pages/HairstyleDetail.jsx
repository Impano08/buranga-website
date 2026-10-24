import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { api, imageUrl } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import MasonryGrid from '../components/MasonryGrid.jsx';
import Spinner from '../components/Spinner.jsx';
import ImagePlaceholder from '../components/ImagePlaceholder.jsx';

export default function HairstyleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    setImageFailed(false);
    Promise.all([
      api.get(`/api/hairstyles/${id}`),
      api.get(`/api/hairstyles/${id}/related`),
    ])
      .then(([d, r]) => {
        setItem(d.item);
        setRelated(r.items);
      })
      .catch((err) => {
        if (err.status === 404) setNotFound(true);
        else error(err.message);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const toggleSave = async () => {
    if (!user) {
      info('Sign in to save hairstyles.');
      navigate('/signin', { state: { from: location.pathname } });
      return;
    }
    try {
      if (item.isFavorite) {
        await api.delete(`/api/favorites/${item.id}`);
        setItem({ ...item, isFavorite: false, savesCount: Math.max(0, item.savesCount - 1) });
        success('Removed from saved styles.');
      } else {
        const data = await api.post(`/api/favorites/${item.id}`);
        setItem({ ...item, isFavorite: true, savesCount: data.savesCount ?? item.savesCount + 1 });
        success('Saved to your collection!');
      }
    } catch (err) {
      error(err.message);
    }
  };

  if (loading) return <Spinner label="Loading hairstyle…" />;
  if (notFound || !item) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-icon"></span>
          <p>We couldn't find that hairstyle. It may have been removed.</p>
          <Link to="/explore" className="btn btn-primary btn-sm">Back to Explore</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page detail-page">
      <div className="detail-card">
        <div className="detail-image">
          {item.imageUrl && !imageFailed ? (
            <img
              src={imageUrl(item.imageUrl)}
              alt={item.title}
              loading="eager"
              decoding="async"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <ImagePlaceholder label="Photo unavailable" />
          )}
        </div>
        <div className="detail-info">
          <div className="detail-actions">
            <button className={`btn ${item.isFavorite ? 'btn-saved' : 'btn-primary'}`} onClick={toggleSave}>
              {item.isFavorite ? 'Saved ✓' : '🔖 Save'}
            </button>
          </div>
          <h1 className="detail-title">{item.title}</h1>
          <p className="detail-desc">{item.description}</p>

          <div className="detail-facts">
            <Link to={`/categories/${encodeURIComponent(item.category)}`} className="fact-chip strong">{item.category}</Link>
            <span className="fact-chip">Length: {item.hairLength}</span>
            <span className="fact-chip">Occasion: {item.occasion}</span>
            <span className="fact-chip">Hair type: {item.hairType}</span>
            <span className="fact-chip">🔖 {item.savesCount} saves</span>
          </div>

          {item.tags?.length > 0 && (
            <div className="detail-tags">
              {item.tags.map((t) => (
                <Link key={t} to={`/explore?q=${encodeURIComponent(t)}`} className="tag-chip">#{t}</Link>
              ))}
            </div>
          )}

          {item.author && (
            <div className="detail-author">
              <span className="author-avatar">{item.author.name?.charAt(0) || 'B'}</span>
              <div>
                <strong>{item.author.name}</strong>
                {item.author.bio && <p>{item.author.bio}</p>}
              </div>
              {item.author.id && <Link to={`/users/${item.author.id}`} className="btn btn-outline btn-sm">View profile</Link>}
            </div>
          )}

          <p className="detail-date">Published {new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      <section className="section">
        <div className="section-head">
          <h2>Related Hairstyles</h2>
        </div>
        <p className="related-note">More ideas matching “{item.category}” and related styles.</p>
        <MasonryGrid items={related} />
      </section>
    </div>
  );
}
