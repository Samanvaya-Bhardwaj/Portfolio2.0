import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import ChatThread from '../../components/chat/ChatThread.jsx';
import ConfirmButton from '../components/ConfirmButton.jsx';
import { useToast } from '../components/Toast.jsx';
import { api } from '../../api/client.js';
import { EVENTS, getSocket } from '../../api/socket.js';
import { formatChatTime, formatDateTime } from '../../utils/format.js';

const TYPING_THROTTLE_MS = 2500;

const displayName = (chat) => chat.name || `Visitor ${chat.id.slice(-4).toUpperCase()}`;
const byLatest = (list) => [...list].sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

export default function Chats() {
  const toast = useToast();
  const [chats, setChats] = useState([]);
  const [status, setStatus] = useState('loading');
  const [openId, setOpenId] = useState(null);
  const [thread, setThread] = useState(null);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const openIdRef = useRef(openId);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  openIdRef.current = openId;

  const loadList = useCallback(
    () =>
      api
        .chats()
        .then((list) => {
          setChats(list);
          setStatus('ready');
        })
        .catch(() => setStatus('error')),
    [],
  );

  const loadThread = useCallback((id) => {
    api
      .chat(id)
      .then((chat) => {
        if (openIdRef.current !== id) return;
        setThread(chat);
        if (chat.unread > 0) api.markChatRead(id).catch(() => {});
      })
      .catch(() => setThread(null));
  }, []);

  useEffect(() => {
    loadList();
    const socket = getSocket();

    const onUpdated = ({ action, chat, id }) => {
      if (action === 'deleted') {
        setChats((list) => list.filter((c) => c.id !== id));
        if (openIdRef.current === id) setOpenId(null);
      } else {
        setChats((list) => byLatest([chat, ...list.filter((c) => c.id !== chat.id)]));
      }
    };
    const onMessage = ({ chatId, message }) => {
      if (chatId !== openIdRef.current) return;
      setThread((t) => (t && !t.messages.some((m) => m.id === message.id) ? { ...t, messages: [...t.messages, message] } : t));
      if (message.from === 'visitor') {
        setTyping(false);
        if (document.visibilityState === 'visible') api.markChatRead(chatId).catch(() => {});
      }
    };
    const onPresence = ({ chatId, online }) => {
      setChats((list) => list.map((c) => (c.id === chatId ? { ...c, online } : c)));
      setThread((t) => (t?.id === chatId ? { ...t, online } : t));
    };
    const onTyping = ({ chatId, from }) => {
      if (from !== 'visitor' || chatId !== openIdRef.current) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 4000);
    };
    // Events may have been missed while offline — refetch.
    const onConnect = () => {
      loadList();
      if (openIdRef.current) loadThread(openIdRef.current);
    };

    socket.on(EVENTS.chatUpdated, onUpdated);
    socket.on(EVENTS.chatMessage, onMessage);
    socket.on(EVENTS.chatPresence, onPresence);
    socket.on(EVENTS.chatTyping, onTyping);
    socket.on('connect', onConnect);
    return () => {
      clearTimeout(typingTimer.current);
      socket.off(EVENTS.chatUpdated, onUpdated);
      socket.off(EVENTS.chatMessage, onMessage);
      socket.off(EVENTS.chatPresence, onPresence);
      socket.off(EVENTS.chatTyping, onTyping);
      socket.off('connect', onConnect);
    };
  }, [loadList, loadThread]);

  useEffect(() => {
    setThread(null);
    setTyping(false);
    setDraft('');
    if (openId) loadThread(openId);
  }, [openId, loadThread]);

  const onDraftChange = (e) => {
    setDraft(e.target.value);
    const now = Date.now();
    if (openId && now - lastTypingSent.current > TYPING_THROTTLE_MS) {
      lastTypingSent.current = now;
      getSocket().emit('chat:typing', { chatId: openId });
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || !openId) return;
    setSending(true);
    try {
      const message = await api.replyChat(openId, text);
      setThread((t) => (t && !t.messages.some((m) => m.id === message.id) ? { ...t, messages: [...t.messages, message] } : t));
      setDraft('');
      lastTypingSent.current = 0;
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
  };

  const onDelete = async () => {
    try {
      await api.deleteChat(openId);
      setChats((list) => list.filter((c) => c.id !== openId));
      setOpenId(null);
      toast('Conversation deleted');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const online = chats.filter((c) => c.online).length;
  const waiting = chats.filter((c) => c.unread > 0).length;

  return (
    <div className="admin-page is-wide">
      <header className="admin-page-head">
        <div>
          <h1>Live chat</h1>
          <p className="muted">
            {chats.length} conversations · {online} visitor{online === 1 ? '' : 's'} on the site · {waiting} awaiting reply
          </p>
        </div>
      </header>

      {status === 'loading' && <div className="loader" role="status" aria-label="Loading" />}
      {status === 'error' && <p className="form-status is-error">Could not load conversations.</p>}

      {status === 'ready' && (
        <div className={`chat-admin card ${openId ? 'has-open' : ''}`}>
          <ul className="chat-list" aria-label="Conversations">
            {chats.length === 0 && (
              <li className="empty-state">
                <Icon name="chat" size={24} />
                <p>No conversations yet. Visitors can start one from the chat button on your site.</p>
              </li>
            )}
            {chats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`chat-row ${c.id === openId ? 'is-active' : ''} ${c.unread ? 'is-unread' : ''}`}
                  onClick={() => setOpenId(c.id)}
                >
                  <span className={`presence-dot ${c.online ? 'is-online' : ''}`} aria-label={c.online ? 'Online' : 'Offline'} />
                  <span className="chat-row-main">
                    <strong>{displayName(c)}</strong>
                    <span className="muted">
                      {c.lastMessage?.from === 'admin' && 'You: '}
                      {c.lastMessage?.text}
                    </span>
                  </span>
                  <span className="chat-row-meta">
                    <time className="mono muted small" dateTime={c.lastMessageAt}>
                      {formatChatTime(c.lastMessageAt)}
                    </time>
                    {c.unread > 0 && <span className="nav-badge">{c.unread}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <section className="chat-pane" aria-label="Conversation">
            {!openId && (
              <div className="empty-state">
                <Icon name="chat" size={24} />
                <p>Select a conversation.</p>
              </div>
            )}
            {openId && !thread && <div className="loader" role="status" aria-label="Loading" />}
            {thread && (
              <>
                <header className="chat-pane-head">
                  <button type="button" className="icon-btn chat-back" onClick={() => setOpenId(null)} aria-label="Back to conversations">
                    <Icon name="arrowLeft" size={16} />
                  </button>
                  <div className="chat-pane-who">
                    <strong>{displayName(thread)}</strong>
                    <span className="muted small">
                      <span className={`presence-dot ${thread.online ? 'is-online' : ''}`} aria-hidden="true" />{' '}
                      {thread.online ? 'On the site now' : 'Left the site'} · started {formatDateTime(thread.createdAt)}
                    </span>
                  </div>
                  {thread.email && (
                    <a className="btn btn-ghost btn-sm" href={`mailto:${thread.email}`}>
                      <Icon name="mail" size={15} /> <span>{thread.email}</span>
                    </a>
                  )}
                  <ConfirmButton onConfirm={onDelete} label="Delete conversation" />
                </header>

                <ChatThread messages={thread.messages} self="admin" typing={typing} typingLabel="Visitor is typing" />

                <form className="chat-compose" onSubmit={send}>
                  {!thread.online && (
                    <p className="chat-note">
                      The visitor has left. They’ll see your reply if they come back{thread.email ? ', or you can email them' : ''}.
                    </p>
                  )}
                  <div className="chat-input-row">
                    <textarea
                      rows={1}
                      maxLength={2000}
                      placeholder="Reply…"
                      aria-label="Reply"
                      value={draft}
                      onChange={onDraftChange}
                      onKeyDown={onKeyDown}
                    />
                    <button type="submit" className="chat-send" disabled={!draft.trim() || sending} aria-label="Send reply">
                      <Icon name="send" size={17} />
                    </button>
                  </div>
                </form>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
