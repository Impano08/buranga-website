import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : '/explore');
    setDrawerOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      success('Signed out. See you soon!');
      navigate('/');
    } catch (err) {
      error(err.message);
    }
    setMenuOpen(false);
  };

  return (
    <header className="navbar">
      <button className="icon-btn hamburger" aria-label="Open menu" onClick={() => setDrawerOpen(true)}>
        ☰
      </button>

      <Link to="/" className="brand" aria-label="BURANGA home">
        <span className="brand-mark">B</span>
        <span className="brand-name">BURANGA</span>
      </Link>

      <form className="nav-search" onSubmit={submitSearch} role="search">
        <span className="nav-search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search men’s, women’s, kids…"
          aria-label="Search hairstyles"
        />
      </form>

      <nav className="nav-actions">
        <NavLink to="/explore" className="nav-link hide-sm">Explore</NavLink>
        <NavLink to="/categories" className="nav-link hide-sm">Categories</NavLink>
        <NavLink to="/upload" className="nav-link nav-upload">＋ Upload</NavLink>
        {user ? (
          <div className="user-menu">
            <button className="avatar-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu">
              {user.name.charAt(0).toUpperCase()}
            </button>
            {menuOpen && (
              <div className="dropdown" onClick={() => setMenuOpen(false)}>
                <div className="dropdown-header">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Link to="/profile" className="dropdown-item">My Profile</Link>
                <Link to="/favorites" className="dropdown-item">Saved Hairstyles</Link>
                <Link to="/upload" className="dropdown-item">Upload Photo</Link>
                <Link to="/profile/edit" className="dropdown-item">Edit Profile</Link>
                <button className="dropdown-item danger" onClick={handleSignOut}>Sign Out</button>
              </div>
            )}
          </div>
        ) : (
          <div className="auth-links">
            <Link to="/signin" className="nav-link">Sign In</Link>
            <Link to="/signup" className="btn btn-primary btn-sm">Sign Up</Link>
          </div>
        )}
      </nav>

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <aside className="mobile-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="brand-name">BURANGA</span>
              <button className="icon-btn" onClick={() => setDrawerOpen(false)} aria-label="Close menu">✕</button>
            </div>
            <form className="drawer-search" onSubmit={submitSearch}>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search hairstyles…"
              />
            </form>
            <NavLink to="/" className="drawer-link" onClick={() => setDrawerOpen(false)}>Home</NavLink>
            <NavLink to="/explore" className="drawer-link" onClick={() => setDrawerOpen(false)}>Explore</NavLink>
            <NavLink to="/categories" className="drawer-link" onClick={() => setDrawerOpen(false)}>Categories</NavLink>
            <NavLink to="/upload" className="drawer-link" onClick={() => setDrawerOpen(false)}>Upload</NavLink>
            {user ? (
              <>
                <NavLink to="/profile" className="drawer-link" onClick={() => setDrawerOpen(false)}>My Profile</NavLink>
                <NavLink to="/favorites" className="drawer-link" onClick={() => setDrawerOpen(false)}>Favorites</NavLink>
                <button className="drawer-link danger" onClick={handleSignOut}>Sign Out</button>
              </>
            ) : (
              <>
                <NavLink to="/signin" className="drawer-link" onClick={() => setDrawerOpen(false)}>Sign In</NavLink>
                <NavLink to="/signup" className="drawer-link" onClick={() => setDrawerOpen(false)}>Sign Up</NavLink>
              </>
            )}
          </aside>
        </div>
      )}
    </header>
  );
}
