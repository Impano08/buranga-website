import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import CategoryGrid from '../components/CategoryGrid.jsx';
import MasonryGrid from '../components/MasonryGrid.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meta, setMeta] = useState(null);
  const [trending, setTrending] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const trendingCategory = encodeURIComponent('Trending Haircut');
    Promise.all([
      api.get('/api/hairstyles/meta'),
      api.get(`/api/hairstyles?category=${trendingCategory}&sort=trending&limit=8`),
      api.get('/api/hairstyles?sort=latest&limit=8'),
    ])
      .then(([m, t, f]) => {
        setMeta(m);
        setTrending(t.items);
        setFeatured(f.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
  };

  return (
    <div className="page">
      <section className="hero">
        <p className="hero-kicker">Welcome to BURANGA</p>
        <h1 className="hero-title">Discover Your Next Hairstyle.</h1>
        <p className="hero-sub">
          Explore men’s, women’s and children’s haircuts, plus the trending looks everyone is loving right now — and save your favourites.
        </p>
        <form className="hero-search" onSubmit={search}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try “fade”, “bob”, “kids braids”, “trending”…"
            aria-label="Search hairstyles"
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <div className="hero-ctas">
          {user ? (
            <>
              <Link to="/upload" className="btn btn-primary">Share Your Hairstyle</Link>
              <Link to="/favorites" className="btn btn-outline">My Saved Styles</Link>
            </>
          ) : (
            <>
              <Link to="/signup" className="btn btn-primary">Join Free</Link>
              <Link to="/explore" className="btn btn-outline">Start Exploring</Link>
            </>
          )}
        </div>
        {meta && (
          <div className="hero-stats">
            <span><strong>{meta.total}</strong> hairstyles</span>
            <span><strong>{meta.categories.length}</strong> categories</span>
            <span><strong>{meta.categories.filter((c) => c.count > 0).length}</strong> active categories</span>
          </div>
        )}
      </section>

      {loading ? (
        <Spinner label="Loading inspiration…" />
      ) : error ? (
        <div className="empty-state error-state">
          <span className="empty-icon">!</span>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={load}>Try again</button>
        </div>
      ) : (
        <>
          {meta && (
            <section className="section">
              <div className="section-head">
                <h2>Browse by Category</h2>
                <Link to="/categories" className="see-all">See all</Link>
              </div>
              <CategoryGrid categories={meta.categories} />
            </section>
          )}

          <section className="section">
            <div className="section-head">
              <h2>Trending Haircut</h2>
              <Link to={`/categories/${encodeURIComponent('Trending Haircut')}`} className="see-all">See all</Link>
            </div>
            <MasonryGrid items={trending} emptyMessage="No trending styles yet. Check back soon!" />
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Featured Hairstyles</h2>
              <Link to="/explore" className="see-all">See all</Link>
            </div>
            <MasonryGrid items={featured} />
          </section>
        </>
      )}
    </div>
  );
}
