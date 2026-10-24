import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { api } from '../api.js';

const QUICK_LINKS = [
  { to: '/', icon: 'B', label: 'Home' },
  { to: '/explore', icon: 'E', label: 'Explore' },
  { to: '/categories', icon: 'C', label: 'Categories' },
  { to: '/upload', icon: '+', label: 'Upload' },
  { to: '/favorites', icon: 'S', label: 'Favorites' },
  { to: '/profile', icon: 'P', label: 'My Profile' },
];

const CATEGORY_INITIALS = {
  "Men's Haircut": 'M',
  "Women's Haircut": 'W',
  "Children's Haircut": 'K',
  'Trending Haircut': 'T',
};

export default function Sidebar() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api
      .get('/api/hairstyles/meta')
      .then((data) => setCategories(data.categories.filter((c) => c.count > 0)))
      .catch(() => setCategories([]));
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-section">
        {QUICK_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </div>

      <div className="sidebar-divider" />
      <p className="sidebar-title">Categories</p>
      <div className="sidebar-section">
        {categories.map((c) => (
          <NavLink
            key={c.name}
            to={`/categories/${encodeURIComponent(c.name)}`}
            className={({ isActive }) => `sidebar-link small${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">{CATEGORY_INITIALS[c.name] || '◦'}</span>
            <span className="sidebar-cat-name">{c.name}</span>
            <span className="sidebar-count">{c.count}</span>
          </NavLink>
        ))}
      </div>
    </aside>
  );
}
