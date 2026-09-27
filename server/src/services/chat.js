import { Chat, CHAT_HISTORY_LIMIT, hashChatToken, newChatToken } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

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
export function hit(times, windowMs, limit, now = Date.now()) {
  while (times.length && now - times[0] > windowMs) times.shift();
  if (times.length >= limit) return false;
  times.push(now);
  return true;
}

/** Raised when a visitor's token no longer matches a conversation (deleted or expired). */
export const chatExpired = () =>
  Object.assign(new ApiError(410, 'This chat has ended. Send your message again to start a new one.'), { expired: true });

export const findChatByToken = (token, projection) =>
  typeof token === 'string' && token && token.length <= 100 ? Chat.findOne({ tokenHash: hashChatToken(token) }, projection) : null;

const lastOnly = { messages: { $slice: -1 } };
const pushMessage = (message) => ({ $push: { messages: { $each: [message], $slice: -CHAT_HISTORY_LIMIT } } });

/**
 * Appends a visitor message, creating the conversation when there is no token yet.
 * `chatId` lets a caller that has already stored a file under that id create the chat with it.
 * Returns `{ chat, saved, issuedToken? }`; `chat` holds only its latest message.
 */
export async function postVisitorMessage({ token, name = '', email = '', text = '', attachment, ip, chatId }) {
  const message = { from: 'visitor', text, ...(attachment && { attachment }), at: new Date() };

  if (token) {
    const $set = { lastMessageAt: message.at };
    if (name) $set.name = name;
    if (email) $set.email = email;
    const chat = await Chat.findOneAndUpdate(
      { tokenHash: hashChatToken(token) },
      { ...pushMessage(message), $inc: { unread: 1 }, $set },
      { new: true, projection: lastOnly },
    );
    if (!chat) throw chatExpired();
    return { chat, saved: chat.messages.at(-1).toJSON() };
  }

  const times = createdByIp.get(ip) ?? [];
  createdByIp.set(ip, times);
  if (!hit(times, CREATE_WINDOW_MS, CREATE_LIMIT)) {
    throw new ApiError(429, 'Too many new chats from your network. Please try again later.');
  }
  const issuedToken = newChatToken();
  const chat = await Chat.create({
    ...(chatId && { _id: chatId }),
    tokenHash: hashChatToken(issuedToken),
    name,
    email,
    messages: [message],
    unread: 1,
    lastMessageAt: message.at,
  });
  return { chat, saved: chat.messages.at(-1).toJSON(), issuedToken };
}

/** Appends an admin message. Replying implies the admin has read the conversation. */
export async function postAdminMessage(chatId, { text = '', attachment }) {
  const message = { from: 'admin', text, ...(attachment && { attachment }), at: new Date() };
  const chat = await Chat.findByIdAndUpdate(
    chatId,
    { ...pushMessage(message), $set: { lastMessageAt: message.at, unread: 0 } },
    { new: true, projection: lastOnly },
  );
  if (!chat) throw ApiError.notFound('Chat not found');
  return { chat, saved: chat.messages.at(-1).toJSON() };
}
