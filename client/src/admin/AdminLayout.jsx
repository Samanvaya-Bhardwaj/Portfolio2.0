import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from '../components/ui/Icon.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/client.js';
import { EVENTS, getSocket } from '../api/socket.js';
import { useToast } from './components/Toast.jsx';
import { RESOURCES } from './resources.js';

const NAV = [
  { to: '/admin', label: 'Overview', icon: 'grid', end: true },
  { to: '/admin/profile', label: 'Profile', icon: 'user' },
  ...Object.entries(RESOURCES).map(([key, r]) => ({ to: `/admin/${key}`, label: r.label, icon: r.icon })),
  { to: '/admin/messages', label: 'Messages', icon: 'inbox', badge: 'unread' },
  { to: '/admin/chats', label: 'Live chat', icon: 'chat', badge: 'chats' },
  { to: '/admin/account', label: 'Account', icon: 'settings' },
];

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const toast = useToast();
  const [unread, setUnread] = useState(0);
  const [chatsUnread, setChatsUnread] = useState(0);
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [connected, setConnected] = useState(() => getSocket().connected);

  useEffect(() => {
    const syncStats = () =>
      api
        .stats()
        .then((s) => {
          setUnread(s.unread);
          setChatsUnread(s.chatsUnread);
        })
        .catch(() => {});
    syncStats();
    const socket = getSocket();
    const onNew = (m) => {
      setUnread((n) => n + 1);
      toast(`New message from ${m.name}`, 'info');
    };
    const onChanged = syncStats;
    const onChatMessage = ({ message }) => {
      if (message.from === 'visitor' && pathRef.current !== '/admin/chats') toast('New live chat message', 'info');
    };
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on(EVENTS.messageNew, onNew);
    socket.on(EVENTS.messageChanged, onChanged);
    socket.on(EVENTS.chatUpdated, onChanged);
    socket.on(EVENTS.chatMessage, onChatMessage);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off(EVENTS.messageNew, onNew);
      socket.off(EVENTS.messageChanged, onChanged);
      socket.off(EVENTS.chatUpdated, onChanged);
      socket.off(EVENTS.chatMessage, onChatMessage);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [toast]);

  const badges = { unread, chats: chatsUnread };

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="brand-mark">SB</span>
          <div>
            <p className="admin-brand-title">Dashboard</p>
            <p className="admin-brand-sub">{admin?.email}</p>
          </div>
        </div>

        <nav aria-label="Admin">
          <ul className="admin-nav">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}>
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>
                  {item.badge && badges[item.badge] > 0 && (
                    <span className="nav-badge" aria-label={`${badges[item.badge]} unread`}>
                      {badges[item.badge]}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-sidebar-foot">
          <p className={`live-indicator ${connected ? 'is-live' : ''}`}>
            <span className="live-dot" aria-hidden="true" />
            {connected ? 'Real-time connected' : 'Reconnecting…'}
          </p>
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-link">
            <Icon name="external" size={17} /> <span>View site</span>
          </a>
          <button type="button" className="admin-nav-link" onClick={logout}>
            <Icon name="logout" size={17} /> <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main" id="admin-main">
        <Outlet context={{ setUnread }} />
      </main>
    </div>
  );
}
