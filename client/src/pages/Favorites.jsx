import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import MasonryGrid from '../components/MasonryGrid.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Favorites() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .get('/api/favorites')
      .then((data) => setItems(data.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnsave = (id) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div className="page">
      <div className="page-head">
        <h1>Saved Hairstyles</h1>
        <p>Your personal inspiration board — {items.length} saved {items.length === 1 ? 'style' : 'styles'}.</p>
      </div>
      {loading ? (
        <Spinner label="Loading your collection…" />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"></span>
          <p>You haven't saved any hairstyles yet. Tap “Save” on any photo to keep it here.</p>
          <Link to="/explore" className="btn btn-primary btn-sm">Explore Hairstyles</Link>
        </div>
      ) : (
        <MasonryGrid items={items} onUnsave={handleUnsave} />
      )}
    </div>
  );
}
