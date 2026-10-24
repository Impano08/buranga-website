import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import MasonryGrid from '../components/MasonryGrid.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Profile() {
  const { id } = useParams();
  const { user, signOut } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const target = id || user?.id;
    if (!target) return;
    setLoading(true);
    api
      .get(`/api/users/${target}`)
      .then((d) => {
        setData(d);
        setTab('posts');
      })
      .catch((err) => error(err.message))
      .finally(() => setLoading(false));
  }, [id, user?.id]);

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this hairstyle post? This cannot be undone.')) return;
    try {
      await api.delete(`/api/hairstyles/${postId}`);
      success('Post deleted.');
      setData((prev) => ({ ...prev, posts: prev.posts.filter((p) => p.id !== postId) }));
    } catch (err) {
      error(err.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    success('Signed out.');
    navigate('/');
  };

  if (loading) return <Spinner label="Loading profile…" />;
  if (!data) {
    return (
      <div className="page">
        <div className="empty-state">
          <span className="empty-icon"></span>
          <p>Profile not found.</p>
          <Link to="/" className="btn btn-primary btn-sm">Go home</Link>
        </div>
      </div>
    );
  }

  const { profile, isOwner, posts, savedItems } = data;

  return (
    <div className="page">
      <div className="profile-head card">
        <div className="profile-avatar">{profile.name.charAt(0).toUpperCase()}</div>
        <div className="profile-info">
          <h1>{profile.name}</h1>
          {profile.bio ? <p className="profile-bio">{profile.bio}</p> : <p className="profile-bio muted">No bio yet.</p>}
          <div className="profile-stats">
            <span><strong>{profile.postCount}</strong> uploads</span>
            {isOwner && <span><strong>{savedItems.length}</strong> saved</span>}
            <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {isOwner && (
          <div className="profile-actions">
            <Link to="/profile/edit" className="btn btn-outline btn-sm">Edit Profile</Link>
            <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>Sign Out</button>
          </div>
        )}
      </div>

      <div className="tabs">
        <button className={`tab${tab === 'posts' ? ' active' : ''}`} onClick={() => setTab('posts')}>
          Uploaded Hairstyles ({posts.length})
        </button>
        {isOwner && (
          <button className={`tab${tab === 'saved' ? ' active' : ''}`} onClick={() => setTab('saved')}>
            Saved Hairstyles ({savedItems.length})
          </button>
        )}
      </div>

      {tab === 'posts' ? (
        posts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📸</span>
            <p>{isOwner ? 'You haven’t uploaded any hairstyles yet.' : `${profile.name} hasn't uploaded any hairstyles yet.`}</p>
            {isOwner && <Link to="/upload" className="btn btn-primary btn-sm">Upload your first photo</Link>}
          </div>
        ) : (
          <>
            <MasonryGrid items={posts} />
            {isOwner && (
              <div className="owner-actions-note card">
                <p>Manage your posts from their detail page, or delete them below:</p>
                <ul className="manage-list">
                  {posts.map((p) => (
                    <li key={p.id}>
                      <Link to={`/hairstyles/${p.id}`}>{p.title}</Link>
                      <span>
                        <Link to={`/hairstyles/${p.id}`} className="btn btn-ghost btn-sm">View</Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p.id)}>Delete</button>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )
      ) : (
        <MasonryGrid items={savedItems} emptyMessage="Nothing saved yet." />
      )}
    </div>
  );
}
