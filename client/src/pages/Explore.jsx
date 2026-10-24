import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import MasonryGrid from '../components/MasonryGrid.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Spinner from '../components/Spinner.jsx';

const EMPTY = { category: '', hairLength: '', occasion: '', hairType: '', sort: 'latest' };

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [meta, setMeta] = useState({ categories: [], hairLengths: [], occasions: [], hairTypes: [] });
  const [results, setResults] = useState({ items: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ ...EMPTY, category: searchParams.get('category') || '', sort: searchParams.get('sort') || 'latest' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const query = searchParams.get('q') || '';

  useEffect(() => {
    api.get('/api/hairstyles/meta').then(setMeta).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '24' });
    if (query) params.set('q', query);
    Object.entries(filters).forEach(([k, v]) => {
      if (v && !(k === 'sort' && v === 'latest')) params.set(k, v);
    });
    api
      .get(`/api/hairstyles?${params.toString()}`)
      .then(setResults)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [searchParams, filters, page]);

  const changeFilters = (next) => {
    setFilters(next);
    setPage(1);
    const params = new URLSearchParams(searchParams);
    if (next.category) params.set('category', next.category);
    else params.delete('category');
    if (next.sort && next.sort !== 'latest') params.set('sort', next.sort);
    else params.delete('sort');
    setSearchParams(params, { replace: true });
  };

  const clearFilters = () => {
    changeFilters({ ...EMPTY });
  };

  return (
    <div className="page">
      <div className="page-head">
        <h1>Explore Hairstyles</h1>
        <p>
          {query ? `Results for “${query}”` : 'Browse every hairstyle on BURANGA'} — {results.total} found
        </p>
      </div>

      <FilterBar meta={meta} filters={filters} onChange={changeFilters} onClear={clearFilters} />

      {loading ? (
        <Spinner label="Finding styles…" />
      ) : error ? (
        <div className="empty-state error-state">
          <span className="empty-icon"></span>
          <p>{error}</p>
          <button className="btn btn-primary btn-sm" onClick={() => setPage(1)}>Try again</button>
        </div>
      ) : (
        <>
          <MasonryGrid items={results.items} emptyMessage={query ? `No hairstyles match “${query}”. Try another keyword.` : undefined} />
          {results.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Previous</button>
              <span>Page {page} of {results.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= results.pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
