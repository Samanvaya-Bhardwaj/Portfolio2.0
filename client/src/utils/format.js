const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-01" → "Jan 2026" */
export function formatMonth(value) {
  if (!value) return '';
  const [y, m] = value.split('-').map(Number);
  if (!y) return value;
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}

export function formatRange(start, end, current, fmt = formatMonth) {
  const a = fmt(start);
  const b = current ? 'Present' : fmt(end);
  if (a && b) return `${a} — ${b}`;
  return a || b || '';
}

export const formatYear = (y) => (y ? String(y) : '');

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Clock time for today, short date otherwise — for chat bubbles and inbox rows. */
export function formatChatTime(iso) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(undefined, sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function sortByOrder(items) {
  return [...items].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || new Date(b.createdAt) - new Date(a.createdAt),
  );
}

/** Group items by a key, preserving first-seen order of groups. */
export function groupBy(items, key) {
  const map = new Map();
  for (const item of items) {
    const k = item[key] || 'Other';
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return [...map.entries()];
}
