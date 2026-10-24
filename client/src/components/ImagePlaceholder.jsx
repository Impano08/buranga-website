export default function ImagePlaceholder({ label = 'Add hairstyle photo' }) {
  return (
    <div className="img-placeholder" role="img" aria-label={label}>
      <svg
        className="img-placeholder-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.6" />
        <path d="M20 15.5l-4.2-4.2a1.5 1.5 0 0 0-2.1 0L5 20" />
      </svg>
      <span className="img-placeholder-text">{label}</span>
    </div>
  );
}
