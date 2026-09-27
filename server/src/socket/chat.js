import mongoose from 'mongoose';
import { chatSendSchema } from '../validators/schemas.js';
import { findChatByToken, hit, postVisitorMessage } from '../services/chat.js';
import { EVENTS, ROOMS } from './events.js';

const SEND_WINDOW_MS = 10_000;
const SEND_LIMIT = 8; // messages per socket per window

/** Mirrors Express's `trust proxy: 1` — the hop our own proxy appended, not a client-supplied value. */
function clientIp(socket) {
  const fwd = socket.handshake.headers['x-forwarded-for'];
  return (typeof fwd === 'string' && fwd.split(',').at(-1).trim()) || socket.handshake.address;
}

export const roomSize = (io, room) => io.sockets.adapter.rooms.get(room)?.size ?? 0;
export const chatOnline = (io, chatId) => roomSize(io, ROOMS.chat(chatId)) > 0;
export const agentOnline = (io) => roomSize(io, ROOMS.admins) > 0;

function notifyPresence(io, chatId) {
  io.to(ROOMS.admins).emit(EVENTS.chatPresence, { chatId, online: chatOnline(io, chatId) });
}

/**
 * Fan a stored message out to the visitor's tabs and the admins, and refresh the inbox row.
 * When `sender` is given it's skipped — it already has the message from its ack.
 */
export function broadcastChatMessage(io, { chat, saved, issuedToken }, sender) {
  const rooms = [ROOMS.chat(chat.id), ROOMS.admins];
  (sender ? sender.to(rooms) : io.to(rooms)).emit(EVENTS.chatMessage, { chatId: chat.id, message: saved });
  io.to(ROOMS.admins).emit(EVENTS.chatUpdated, {
    action: issuedToken ? 'created' : 'updated',
    chat: chat.toSummary(chatOnline(io, chat.id)),
  });
}

/**
 * Visitor side of live chat. A visitor has no account: the first message creates a
 * conversation and returns a random session token, which their browser keeps and
 * presents to resume it (across reloads and tabs). Admins reply through the REST API,
 * and files are uploaded over REST by both sides (routes/chatFiles.js).
 */
export function registerChatHandlers(io, socket) {
  const sends = [];
  const reply = (ack, payload) => typeof ack === 'function' && ack(payload);
  const safe = (handler) => async (payload, ack) => {
    try {
      await handler(payload, ack);
    } catch (err) {
      if (err.status && err.status < 500) return reply(ack, { ok: false, error: err.message, ...(err.expired && { expired: true }) });
      console.error('[chat]', err);
      reply(ack, { ok: false, error: 'Something went wrong. Please try again.' });
    }
  };

  const attach = (chatId) => {
    if (socket.data.chatId === chatId) return;
    if (socket.data.chatId) {
      const previous = socket.data.chatId;
      socket.leave(ROOMS.chat(previous));
      notifyPresence(io, previous);
    }
    socket.data.chatId = chatId;
    socket.join(ROOMS.chat(chatId));
    notifyPresence(io, chatId);
  };

  // Called on every (re)connect. Without a token it just reports whether an admin is online.
  socket.on(
    'chat:resume',
    safe(async (token, ack) => {
      const base = { agentOnline: agentOnline(io) };
      const chat = await findChatByToken(token);
      if (!chat) return reply(ack, { ok: false, ...(token && { expired: true }), ...base });
      attach(chat.id);
      reply(ack, { ok: true, chat: chat.toVisitorView(), ...base });
    }),
  );

  socket.on(
    'chat:send',
    safe(async (input, ack) => {
      const parsed = chatSendSchema.safeParse(input ?? {});
      if (!parsed.success) return reply(ack, { ok: false, error: parsed.error.issues[0]?.message || 'Invalid message' });
      if (!hit(sends, SEND_WINDOW_MS, SEND_LIMIT)) {
        return reply(ack, { ok: false, error: 'You’re sending messages too quickly. Please slow down.' });
      }

      const result = await postVisitorMessage({ ...parsed.data, ip: clientIp(socket) });
      attach(result.chat.id);
      broadcastChatMessage(io, result, socket);
      reply(ack, { ok: true, chatId: result.chat.id, message: result.saved, ...(result.issuedToken && { token: result.issuedToken }) });
    }),
  );

  // Typing indicators are ephemeral and never stored.
  socket.on('chat:typing', (payload) => {
    const chatId = payload?.chatId;
    if (chatId && socket.rooms.has(ROOMS.admins)) {
      if (mongoose.isValidObjectId(chatId)) socket.to(ROOMS.chat(chatId)).emit(EVENTS.chatTyping, { chatId, from: 'admin' });
    } else if (socket.data.chatId) {
      socket.to(ROOMS.admins).emit(EVENTS.chatTyping, { chatId: socket.data.chatId, from: 'visitor' });
    }
  });

  // By 'disconnect' the socket has already left its rooms, so the count is accurate.
  socket.on('disconnect', () => {
    if (socket.data.chatId) notifyPresence(io, socket.data.chatId);
  });
}
