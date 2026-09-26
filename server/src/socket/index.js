import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { verifyToken } from '../middleware/auth.js';

export const ROOMS = { admins: 'admins' };

export const EVENTS = {
  contentChanged: 'content:changed', // { resource, action, item?, id? } → everyone
  messageNew: 'message:new', // Message → admins only
  messageChanged: 'message:changed', // { action, item?, id? } → admins only
};

let io = null;

/**
 * Socket.IO is used purely for change notifications. MongoDB stays the source of truth:
 * each event mirrors a write that has already been committed.
 */
export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });

  io.on('connection', (socket) => {
    // Admin dashboards authenticate with the same JWT used for the REST API.
    if (verifyToken(socket.handshake.auth?.token)) socket.join(ROOMS.admins);

    socket.on('admin:auth', (token, ack) => {
      const ok = Boolean(verifyToken(token));
      if (ok) socket.join(ROOMS.admins);
      else socket.leave(ROOMS.admins);
      if (typeof ack === 'function') ack({ ok });
    });
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
