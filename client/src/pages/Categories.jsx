import { useEffect, useState } from 'react';
import { api } from '../api.js';
import CategoryGrid from '../components/CategoryGrid.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Categories() {
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    api.get('/api/hairstyles/meta').then(setMeta).catch(() => {});
  }, []);

  if (!meta) return <Spinner label="Loading categories…" />;

  return (
    <div className="page">
      <div className="page-head">
        <h1>Categories</h1>
        <p>Pick a category and get inspired — {meta.total} styles in total.</p>
      </div>
      <CategoryGrid categories={meta.categories} />
    </div>
  );
}
