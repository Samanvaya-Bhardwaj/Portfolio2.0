import { useEffect, useRef } from 'react';
import Icon from '../ui/Icon.jsx';
import { formatChatTime } from '../../utils/format.js';
import { formatBytes } from './files.js';

/**
 * Message bubbles shared by the visitor widget and the admin inbox.
 * `self` is whichever side is looking ('visitor' | 'admin'); their bubbles sit on the right.
 * `onOpenFile(attachment)` downloads an attachment with that side's credentials.
 */
export default function ChatThread({ messages, self, typing = false, typingLabel = 'typing', empty = null, onOpenFile }) {
  const scroller = useRef(null);

  // Scroll the thread itself (not the page) to the newest message.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  return (
    <div className="chat-thread" ref={scroller} role="log" aria-live="polite" aria-relevant="additions">
      {messages.length === 0 && empty}
      {messages.map((m) => (
        <div key={m.id} className={`chat-bubble ${m.from === self ? 'is-self' : 'is-other'}`}>
          {m.attachment && (
            <button type="button" className="chat-file" onClick={() => onOpenFile?.(m.attachment)} title={`Download ${m.attachment.name}`}>
              <Icon name="file" size={20} />
              <span className="chat-file-info">
                <span className="chat-file-name">{m.attachment.name}</span>
                <span className="chat-file-size">{formatBytes(m.attachment.size)}</span>
              </span>
              <Icon name="download" size={16} />
            </button>
          )}
          {m.text && <p>{m.text}</p>}
          <time dateTime={m.at}>{formatChatTime(m.at)}</time>
        </div>
      ))}
      {typing && (
        <div className="chat-bubble is-other is-typing" aria-label={typingLabel}>
          <span />
          <span />
          <span />
        </div>
      )}
    </div>
  );
}
