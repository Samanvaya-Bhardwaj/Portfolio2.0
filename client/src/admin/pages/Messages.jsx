import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../../components/ui/Icon.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../../api/client.js';
import { EVENTS, getSocket } from '../../api/socket.js';
import { formatDateTime } from '../../utils/format.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'read', label: 'Read' },
];

export default function Messages() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('loading');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api
      .messages()
      .then((r) => {
        setMessages(r.data);
        setStatus('ready');
      })
      .catch(() => setStatus('error'));

    // Live inbox: new submissions and changes from other admin tabs.
    const socket = getSocket();
    const onNew = (m) => setMessages((list) => [m, ...list.filter((x) => x.id !== m.id)]);
    const onChanged = ({ action, item, id }) =>
      setMessages((list) => (action === 'deleted' ? list.filter((x) => x.id !== id) : list.map((x) => (x.id === item.id ? item : x))));
    socket.on(EVENTS.messageNew, onNew);
    socket.on(EVENTS.messageChanged, onChanged);
    return () => {
      socket.off(EVENTS.messageNew, onNew);
      socket.off(EVENTS.messageChanged, onChanged);
    };
  }, []);

  const visible = useMemo(
    () => messages.filter((m) => filter === 'all' || (filter === 'unread' ? !m.read : m.read)),
    [messages, filter],
  );
  const unread = messages.filter((m) => !m.read).length;

  const setRead = async (m, read) => {
    try {
      const { data } = await api.markMessage(m.id, read);
      setMessages((list) => list.map((x) => (x.id === data.id ? data : x)));
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const toggleOpen = (m) => {
    setOpenId((id) => (id === m.id ? null : m.id));
    if (!m.read) setRead(m, true);
  };

  const onDelete = async (m) => {
    try {
      await api.deleteMessage(m.id);
      setMessages((list) => list.filter((x) => x.id !== m.id));
      toast('Message deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="admin-page">
      <header className="admin-page-head">
        <div>
          <h1>Messages</h1>
          <p className="muted">
            {messages.length} total · {unread} unread
          </p>
        </div>
        <div className="segmented" role="tablist" aria-label="Filter messages">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'is-active' : ''} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      {status === 'loading' && <div className="loader" role="status" aria-label="Loading" />}
      {status === 'error' && <p className="form-status is-error">Could not load messages.</p>}
      {status === 'ready' && visible.length === 0 && (
        <div className="card empty-state">
          <Icon name="inbox" size={24} />
          <p>Nothing here.</p>
        </div>
      )}

      <ul className="message-list">
        <AnimatePresence initial={false}>
          {visible.map((m) => {
            const open = openId === m.id;
            return (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`card message ${m.read ? '' : 'is-unread'} ${open ? 'is-open' : ''}`}
              >
                <button type="button" className="message-head" onClick={() => toggleOpen(m)} aria-expanded={open}>
                  {!m.read && <span className="unread-dot" aria-label="Unread" />}
                  <span className="message-from">
                    <strong>{m.name}</strong>
                    <span className="muted">{m.email}</span>
                  </span>
                  <span className="message-subject">{m.subject || m.message.slice(0, 80)}</span>
                  <time className="mono muted small" dateTime={m.createdAt}>
                    {formatDateTime(m.createdAt)}
                  </time>
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      className="message-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <p className="message-text">{m.message}</p>
                      <div className="message-actions">
                        <a
                          className="btn btn-primary btn-sm"
                          href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'your message'}`)}`}
                        >
                          <Icon name="mail" size={15} /> Reply
                        </a>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRead(m, !m.read)}>
                          Mark as {m.read ? 'unread' : 'read'}
                        </button>
                        <ConfirmButton onConfirm={() => onDelete(m)} label="Delete message" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </div>
  );
}
