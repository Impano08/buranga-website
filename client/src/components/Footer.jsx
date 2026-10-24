import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

export default function Footer() {
  const [credits, setCredits] = useState([]);

  useEffect(() => {
    fetch('/api/credits').then((r) => r.json()).then((d) => setCredits(d.photos || [])).catch(() => {});
  }, []);
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <span className="brand-name footer-brand">BURANGA</span>
          <p className="footer-tag">Discover your next hairstyle.</p>
        </div>
        <div className="footer-links">
          <Link to="/categories/Men's%20Haircut">Men’s Haircut</Link>
          <Link to="/categories/Women's%20Haircut">Women’s Haircut</Link>
          <Link to="/categories/Children's%20Haircut">Children’s Haircut</Link>
          <Link to="/categories/Trending%20Haircut">Trending Haircut</Link>
        </div>
      </div>
      <p className="footer-note">
        Hairstyle photographs sourced from <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a> and used under the Pexels licence. Hairstyle photos are for inspiration.
      </p>
      {credits.length > 0 && (
        <p className="footer-credit">
          Photo credits: {credits.slice(0, 6).map((c) => (
            <a key={c.file} href={c.pexelsUrl} target="_blank" rel="noreferrer">{c.photographer}</a>
          ))}
          {credits.length > 6 && <> +{credits.length - 6} more</>}
        </p>
      )}
    </footer>
  );
}

