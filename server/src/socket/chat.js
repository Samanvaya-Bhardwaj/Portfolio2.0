import mongoose from 'mongoose';
import { Chat, CHAT_HISTORY_LIMIT, hashChatToken, newChatToken } from '../models/index.js';
import { chatSendSchema } from '../validators/schemas.js';
import { EVENTS, ROOMS } from './events.js';

const SEND_WINDOW_MS = 10_000;
const SEND_LIMIT = 8; // messages per socket per window
const CREATE_WINDOW_MS = 60 * 60 * 1000;
const CREATE_LIMIT = 5; // new conversations per IP per window

const createdByIp = new Map(); // ip → timestamps of conversations started

setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of createdByIp) {
    if (!times.length || now - times.at(-1) > CREATE_WINDOW_MS) createdByIp.delete(ip);
  }
}, 10 * 60 * 1000).unref();

/** Sliding-window limiter: records the hit and returns false once `limit` is reached. */
function hit(times, windowMs, limit, now = Date.now()) {
  while (times.length && now - times[0] > windowMs) times.shift();
  if (times.length >= limit) return false;
  times.push(now);
  return true;
}

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
 * Visitor side of live chat. A visitor has no account: the first message creates a
 * conversation and returns a random session token, which their browser keeps and
 * presents to resume it (across reloads and tabs). Admins reply through the REST API.
 */
export function registerChatHandlers(io, socket) {
  const sends = [];
  const reply = (ack, payload) => typeof ack === 'function' && ack(payload);
  const safe = (handler) => async (payload, ack) => {
    try {
      await handler(payload, ack);
    } catch (err) {
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
      if (typeof token !== 'string' || !token || token.length > 100) return reply(ack, { ok: false, ...base });
      const chat = await Chat.findOne({ tokenHash: hashChatToken(token) });
      if (!chat) return reply(ack, { ok: false, expired: true, ...base });
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

      const { token, name, email, text } = parsed.data;
      const message = { from: 'visitor', text, at: new Date() };
      let chat;
      let issuedToken;

      if (token) {
        const $set = { lastMessageAt: message.at };
        if (name) $set.name = name;
        if (email) $set.email = email;
        chat = await Chat.findOneAndUpdate(
          { tokenHash: hashChatToken(token) },
          { $push: { messages: { $each: [message], $slice: -CHAT_HISTORY_LIMIT } }, $inc: { unread: 1 }, $set },
          { new: true, projection: { messages: { $slice: -1 } } },
        );
        if (!chat) return reply(ack, { ok: false, expired: true, error: 'This chat has ended. Send your message again to start a new one.' });
      } else {
        const ip = clientIp(socket);
        const times = createdByIp.get(ip) ?? [];
        createdByIp.set(ip, times);
        if (!hit(times, CREATE_WINDOW_MS, CREATE_LIMIT)) {
          return reply(ack, { ok: false, error: 'Too many new chats from your network. Please try again later.' });
        }
        issuedToken = newChatToken();
        chat = await Chat.create({ tokenHash: hashChatToken(issuedToken), name, email, messages: [message], unread: 1, lastMessageAt: message.at });
      }

      const saved = chat.messages.at(-1).toJSON();
      attach(chat.id);
      // The sender gets the message in its ack; its other tabs and the admins get it here.
      socket.to([ROOMS.chat(chat.id), ROOMS.admins]).emit(EVENTS.chatMessage, { chatId: chat.id, message: saved });
      io.to(ROOMS.admins).emit(EVENTS.chatUpdated, {
        action: issuedToken ? 'created' : 'updated',
        chat: chat.toSummary(chatOnline(io, chat.id)),
      });
      reply(ack, { ok: true, chatId: chat.id, message: saved, ...(issuedToken && { token: issuedToken }) });
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
