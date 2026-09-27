import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/ui/Icon.jsx';
import { api } from '../../api/client.js';
import { EVENTS, getSocket } from '../../api/socket.js';
import { RESOURCES } from '../resources.js';
import { formatDateTime } from '../../utils/format.js';

export default function Overview() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);

  const load = useCallback(() => {
    api.stats().then(setStats).catch(() => {});
    api.messages().then((r) => setRecent(r.data.slice(0, 5))).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const socket = getSocket();
    const events = [EVENTS.contentChanged, EVENTS.messageNew, EVENTS.messageChanged, EVENTS.chatUpdated];
    events.forEach((e) => socket.on(e, load));
    return () => events.forEach((e) => socket.off(e, load));
  }, [load]);

  const cards = [
    ...Object.entries(RESOURCES).map(([key, r]) => ({ key, label: r.label, icon: r.icon, value: stats?.[key], to: `/admin/${key}` })),
    { key: 'messages', label: 'Messages', icon: 'inbox', value: stats?.messages, sub: stats ? `${stats.unread} unread` : '', to: '/admin/messages' },
    { key: 'chats', label: 'Live chats', icon: 'chat', value: stats?.chats, sub: stats ? `${stats.chatsUnread} awaiting reply` : '', to: '/admin/chats' },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">Changes you save here appear on the live site instantly.</p>
        </div>
      </header>

      <div className="stat-grid">
        {cards.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link to={c.to} className="card stat-card">
              <span className="stat-icon">
                <Icon name={c.icon} size={18} />
              </span>
              <span className="stat-value">{c.value ?? '–'}</span>
              <span className="stat-label">{c.label}</span>
              {c.sub && <span className="stat-sub">{c.sub}</span>}
            </Link>
          </motion.div>
        ))}
      </div>

      <section className="card admin-panel" aria-labelledby="recent-title">
        <header className="panel-head">
          <h2 id="recent-title">Recent messages</h2>
          <Link to="/admin/messages" className="link small">
            View all →
          </Link>
        </header>
        {recent.length === 0 ? (
          <p className="muted empty">No messages yet.</p>
        ) : (
          <ul className="recent-list">
            {recent.map((m) => (
              <li key={m.id} className={m.read ? '' : 'is-unread'}>
                <span className="recent-name">{m.name}</span>
                <span className="recent-subject">{m.subject || m.message.slice(0, 70)}</span>
                <time className="recent-time mono" dateTime={m.createdAt}>
                  {formatDateTime(m.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
