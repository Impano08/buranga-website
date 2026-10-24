import { Link } from 'react-router-dom';

export default function FilterBar({ meta, filters, onChange, onClear }) {
  const select = (name, label, options) => (
    <label className="filter-field">
      <span>{label}</span>
      <select value={filters[name] || ''} onChange={(e) => onChange({ ...filters, [name]: e.target.value })}>
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="filter-bar">
      {select('category', 'Category', meta.categories.map((c) => c.name))}
      {select('hairLength', 'Length', meta.hairLengths)}
      {select('occasion', 'Occasion', meta.occasions)}
      {select('hairType', 'Hair type', meta.hairTypes)}
      <label className="filter-field">
        <span>Sort</span>
        <select value={filters.sort || 'latest'} onChange={(e) => onChange({ ...filters, sort: e.target.value })}>
          <option value="latest">Latest</option>
          <option value="trending">Trending</option>
        </select>
      </label>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClear}>Clear filters</button>
      <Link to="/categories" className="filter-all-link">Browse all categories →</Link>
    </div>
  );
}
