import { io } from 'socket.io-client';
import { tokenStore } from './client.js';

export const EVENTS = {
  contentChanged: 'content:changed',
  messageNew: 'message:new',
  messageChanged: 'message:changed',
};

let socket;

/**
 * One shared connection per tab. The auth callback runs on every (re)connect,
 * so an admin token issued after page load is picked up automatically.
 */
export function getSocket() {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL || undefined, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      auth: (cb) => cb({ token: tokenStore.get() }),
      reconnectionDelayMax: 10_000,
    });
  }
  return socket;
}

/** Re-announce credentials on an open connection (after login/logout). */
export function refreshSocketAuth() {
  const s = getSocket();
  if (s.connected) s.emit('admin:auth', tokenStore.get());
}
