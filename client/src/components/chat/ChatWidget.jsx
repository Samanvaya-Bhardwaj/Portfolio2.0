import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../ui/Icon.jsx';
import ChatThread from './ChatThread.jsx';
import { EVENTS, getSocket } from '../../api/socket.js';

const TOKEN_KEY = 'portfolio.chat.token';
const TYPING_THROTTLE_MS = 2500;

let memoryToken = null;

/** The visitor's chat session token. Whoever holds it can read and continue the conversation. */
const chatToken = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return memoryToken;
    }
  },
  set: (token) => {
    memoryToken = token || null;
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable (private mode) — the chat lasts until reload */
    }
  },
};

export default function ChatWidget({ ownerName }) {
  const [open, setOpen] = useState(false);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [contact, setContact] = useState({ name: '', email: '' });
  const [draft, setDraft] = useState('');
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [agentOnline, setAgentOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [unseen, setUnseen] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const openRef = useRef(open);
  const chatIdRef = useRef(chatId);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const inputRef = useRef(null);
  openRef.current = open;
  chatIdRef.current = chatId;

  const addMessage = useCallback((m) => setMessages((list) => (list.some((x) => x.id === m.id) ? list : [...list, m])), []);

  const reset = useCallback(() => {
    chatToken.set(null);
    setChatId(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    const socket = getSocket();

    // Re-join the conversation on every (re)connect; the server also reports whether an admin is online.
    const resume = () => {
      socket.emit('chat:resume', chatToken.get(), (res) => {
        setAgentOnline(Boolean(res?.agentOnline));
        if (res?.ok) {
          setChatId(res.chat.id);
          setMessages(res.chat.messages);
          setContact({ name: res.chat.name, email: res.chat.email });
        } else if (res?.expired || !chatToken.get()) {
          reset();
        }
      });
    };
    const onConnect = () => {
      setConnected(true);
      resume();
    };
    const onDisconnect = () => setConnected(false);
    // An admin browsing their own site also receives every chat's events — ignore other conversations.
    const onMessage = ({ chatId: id, message }) => {
      if (id !== chatIdRef.current) return;
      addMessage(message);
      if (message.from === 'admin') {
        setTyping(false);
        if (!openRef.current) setUnseen((n) => n + 1);
      }
    };
    const onTyping = ({ chatId: id, from }) => {
      if (from !== 'admin' || id !== chatIdRef.current) return;
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 4000);
    };
    const onAgent = ({ online }) => setAgentOnline(online);
    const onClosed = () => {
      reset();
      setNotice('This conversation was closed. Send a message to start a new one.');
    };

    // A chat started (or closed) in another tab.
    const onStorage = (e) => e.key === TOKEN_KEY && socket.connected && resume();

    if (socket.connected) resume();
    window.addEventListener('storage', onStorage);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(EVENTS.chatMessage, onMessage);
    socket.on(EVENTS.chatTyping, onTyping);
    socket.on(EVENTS.chatAgent, onAgent);
    socket.on(EVENTS.chatClosed, onClosed);
    return () => {
      clearTimeout(typingTimer.current);
      window.removeEventListener('storage', onStorage);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(EVENTS.chatMessage, onMessage);
      socket.off(EVENTS.chatTyping, onTyping);
      socket.off(EVENTS.chatAgent, onAgent);
      socket.off(EVENTS.chatClosed, onClosed);
    };
  }, [addMessage, reset]);

  useEffect(() => {
    if (!open) return undefined;
    setUnseen(0);
    inputRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const onDraftChange = (e) => {
    setDraft(e.target.value);
    const now = Date.now();
    if (chatId && now - lastTypingSent.current > TYPING_THROTTLE_MS) {
      lastTypingSent.current = now;
      getSocket().emit('chat:typing');
    }
  };

  const send = (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    setNotice('');
    getSocket()
      .timeout(10_000)
      .emit('chat:send', { token: chatToken.get(), name: contact.name, email: contact.email, text }, (err, res) => {
        setSending(false);
        if (err) return setError('Couldn’t reach the server. Check your connection and try again.');
        if (!res.ok) {
          if (res.expired) reset();
          return setError(res.error);
        }
        if (res.token) chatToken.set(res.token);
        setChatId(res.chatId);
        addMessage(res.message);
        setDraft('');
        lastTypingSent.current = 0;
      });
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
  };

  const firstName = ownerName?.split(' ')[0] || 'me';
  const started = messages.length > 0;

  return (
    <div className="chat-widget">
      <AnimatePresence>
        {open && (
          <motion.section
            className="chat-panel card"
            role="dialog"
            aria-label={`Chat with ${firstName}`}
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="chat-panel-head">
              <div>
                <p className="chat-panel-title">Chat with {firstName}</p>
                <p className={`live-indicator ${connected && agentOnline ? 'is-live' : ''}`}>
                  <span className="live-dot" aria-hidden="true" />
                  {!connected ? 'Reconnecting…' : agentOnline ? 'Online now' : 'Away — leave a message'}
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setOpen(false)} aria-label="Close chat">
                <Icon name="close" size={16} />
              </button>
            </header>

            <ChatThread
              messages={messages}
              self="visitor"
              typing={typing}
              typingLabel={`${firstName} is typing`}
              empty={
                <p className="chat-empty muted">
                  Hi! 👋 Ask me anything about my work.
                  {agentOnline ? ' I’m around and will reply here.' : ' I’m away right now — leave your email and I’ll get back to you.'}
                </p>
              }
            />

            <form className="chat-compose" onSubmit={send}>
              {!started && (
                <div className="chat-contact">
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    aria-label="Your name"
                    maxLength={60}
                    autoComplete="name"
                    value={contact.name}
                    onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                  />
                  <input
                    type="email"
                    placeholder="Email (optional)"
                    aria-label="Your email"
                    maxLength={200}
                    autoComplete="email"
                    value={contact.email}
                    onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                  />
                </div>
              )}
              {(error || notice) && (
                <p className={`chat-note ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>
                  {error || notice}
                </p>
              )}
              <div className="chat-input-row">
                <textarea
                  ref={inputRef}
                  rows={1}
                  maxLength={1000}
                  placeholder="Type a message…"
                  aria-label="Message"
                  value={draft}
                  onChange={onDraftChange}
                  onKeyDown={onKeyDown}
                />
                <button type="submit" className="chat-send" disabled={!draft.trim() || sending || !connected} aria-label="Send message">
                  <Icon name="send" size={17} />
                </button>
              </div>
            </form>
          </motion.section>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="chat-launcher"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? 'Close chat' : `Chat with ${firstName}${unseen ? ` (${unseen} new)` : ''}`}
      >
        <Icon name={open ? 'close' : 'chat'} size={22} />
        {agentOnline && !open && <span className="chat-launcher-dot" aria-hidden="true" />}
        {unseen > 0 && !open && <span className="chat-launcher-badge">{unseen}</span>}
      </button>
    </div>
  );
}
