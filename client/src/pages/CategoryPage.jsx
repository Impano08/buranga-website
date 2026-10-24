import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { categoryMeta } from '../categories.js';
import MasonryGrid from '../components/MasonryGrid.jsx';
import Spinner from '../components/Spinner.jsx';

export default function CategoryPage() {
  const { category } = useParams();
  const meta = categoryMeta(category);
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ category, page: String(page), limit: '24', sort: 'latest' });
    api
      .get(`/api/hairstyles?${params.toString()}`)
      .then(setData)
      .catch(() => setData({ items: [], total: 0, pages: 1 }))
      .finally(() => setLoading(false));
  }, [category, page]);

  return (
    <div className="page">
      <div className="page-head category-page-head">
        <Link to="/categories" className="back-link">← All categories</Link>
        <h1>{category}</h1>
        <p>{meta.blurb}</p>
        <p className="category-count">{data.total} hairstyles in this category</p>
      </div>
      {loading ? (
        <Spinner label={`Loading ${category}…`} />
      ) : (
        <>
          <MasonryGrid items={data.items} emptyMessage="No hairstyles in this category yet. Be the first to upload one!" />
          {data.pages > 1 && (
            <div className="pagination">
              <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setSearchParams({ page: String(page - 1) })}>← Previous</button>
              <span>Page {page} of {data.pages}</span>
              <button className="btn btn-outline btn-sm" disabled={page >= data.pages} onClick={() => setSearchParams({ page: String(page + 1) })}>Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
