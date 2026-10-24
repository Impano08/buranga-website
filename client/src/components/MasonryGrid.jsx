import HairstyleCard from './HairstyleCard.jsx';

export default function MasonryGrid({ items, onUnsave, emptyMessage }) {
  if (!items || items.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon"></span>
        <p>{emptyMessage || 'No hairstyles found. Try a different search or category.'}</p>
      </div>
    );
  }
  return (
    <div className="masonry">
      {items.map((item) => (
        <HairstyleCard key={item.id} item={item} onUnsave={onUnsave} />
      ))}
    </div>
  );
}
