export default function TagList({ items, label = 'Technologies', className = '' }) {
  if (!items?.length) return null;
  return (
    <ul className={`tag-list ${className}`} aria-label={label}>
      {items.map((t) => (
        <li key={t} className="tag">
          {t}
        </li>
      ))}
    </ul>
  );
}
