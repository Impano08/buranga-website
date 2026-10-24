import { Link } from 'react-router-dom';
import { categoryMeta } from '../categories.js';

export default function CategoryGrid({ categories }) {
  return (
    <div className="category-grid">
      {categories.map((c) => {
        const meta = categoryMeta(c.name);
        return (
          <Link key={c.name} to={`/categories/${encodeURIComponent(c.name)}`} className="category-tile image-tile">
            {meta.image && (
              <img className="category-tile-img" src={meta.image} alt="" loading="lazy" />
            )}
            <span className="category-tile-overlay">
              <span className="category-tile-name">{c.name}</span>
              <span className="category-tile-blurb">{meta.blurb}</span>
              <span className="category-tile-count">{c.count} styles</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
