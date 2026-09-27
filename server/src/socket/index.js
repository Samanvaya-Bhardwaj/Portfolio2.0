import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/auth.js';
import { EVENTS, ROOMS } from './events.js';
import { agentOnline, broadcastChatMessage, chatOnline, registerChatHandlers } from './chat.js';

export { EVENTS, ROOMS };

let io = null;
let lastAgentOnline = false;

/** Tell visitors when the first admin arrives or the last one leaves. */
function syncAgentPresence() {
  const online = agentOnline(io);
  if (online === lastAgentOnline) return;
  lastAgentOnline = online;
  io.emit(EVENTS.chatAgent, { online });
}

/**
 * Socket.IO is used for change notifications and live chat. MongoDB stays the source of
 * truth: each event mirrors a write that has already been committed.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    // Admin dashboards authenticate with the same JWT used for the REST API.
    if (verifyToken(socket.handshake.auth?.token)) {
      socket.join(ROOMS.admins);
      syncAgentPresence();
    }

    socket.on('admin:auth', (token, ack) => {
      const ok = Boolean(verifyToken(token));
      if (ok) socket.join(ROOMS.admins);
      else socket.leave(ROOMS.admins);
      syncAgentPresence();
      if (typeof ack === 'function') ack({ ok });
    });

    registerChatHandlers(io, socket);
    socket.on('disconnect', syncAgentPresence);
  });

  return io;
}

/** Broadcast a committed content change to every connected client. */
export function broadcastContent(resource, action, payload = {}) {
  io?.emit(EVENTS.contentChanged, { resource, action, ...payload, at: Date.now() });
}

/** Notify only authenticated admin sockets (contact messages are private). */
export function notifyAdmins(event, payload) {
  io?.to(ROOMS.admins).emit(event, payload);
}

/** Emit to every open tab of one visitor's conversation. */
export function emitToChat(chatId, event, payload) {
  io?.to(ROOMS.chat(chatId)).emit(event, payload);
}

/** Deliver a stored chat message (from services/chat.js) to the visitor's tabs and all admins. */
export function announceChatMessage(result) {
  if (io) broadcastChatMessage(io, result);
}

export const isChatOnline = (chatId) => (io ? chatOnline(io, chatId) : false);
