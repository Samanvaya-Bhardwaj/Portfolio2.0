export const ROOMS = {
  admins: 'admins',
  chat: (id) => `chat:${id}`, // every open tab of one visitor's conversation
};

export const EVENTS = {
  contentChanged: 'content:changed', // { resource, action, item?, id? } → everyone
  messageNew: 'message:new', // Message → admins only
  messageChanged: 'message:changed', // { action, item?, id? } → admins only

  // Live chat
  chatMessage: 'chat:message', // { chatId, message } → that conversation's room + admins
  chatUpdated: 'chat:updated', // { action, chat?, id? } → admins only (inbox rows)
  chatTyping: 'chat:typing', // { chatId, from } → the other side
  chatPresence: 'chat:presence', // { chatId, online } → admins only: is the visitor still on the site?
  chatAgent: 'chat:agent', // { online } → everyone: is an admin around to answer?
  chatClosed: 'chat:closed', // {} → that conversation's room, after an admin deletes it
};
