import { Router } from 'express';
import { Chat, CHAT_HISTORY_LIMIT } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectId } from '../middleware/validate.js';
import { chatReplySchema } from '../validators/schemas.js';
import { EVENTS, emitToChat, emitToChatAndAdmins, isChatOnline, notifyAdmins } from '../socket/index.js';
import { ApiError } from '../utils/ApiError.js';

// Admin side of live chat. Visitors talk over Socket.IO (see socket/chat.js).
const router = Router();
router.use(requireAuth);

const lastOnly = { messages: { $slice: -1 } };

router.get('/', async (_req, res) => {
  const chats = await Chat.find().select(lastOnly).sort({ lastMessageAt: -1 }).limit(200);
  res.json({ data: chats.map((c) => c.toSummary(isChatOnline(c.id))) });
});

router.get('/:id', validateObjectId(), async (req, res) => {
  const chat = await Chat.findById(req.params.id);
  if (!chat) throw ApiError.notFound('Chat not found');
  res.json({ data: { ...chat.toJSON(), online: isChatOnline(chat.id) } });
});

router.post('/:id/messages', validateObjectId(), validateBody(chatReplySchema), async (req, res) => {
  const message = { from: 'admin', text: req.body.text, at: new Date() };
  const chat = await Chat.findByIdAndUpdate(
    req.params.id,
    {
      $push: { messages: { $each: [message], $slice: -CHAT_HISTORY_LIMIT } },
      $set: { lastMessageAt: message.at, unread: 0 }, // replying implies it's been read
    },
    { new: true, projection: lastOnly },
  );
  if (!chat) throw ApiError.notFound('Chat not found');

  const saved = chat.messages.at(-1).toJSON();
  emitToChatAndAdmins(chat.id, EVENTS.chatMessage, { chatId: chat.id, message: saved });
  notifyAdmins(EVENTS.chatUpdated, { action: 'updated', chat: chat.toSummary(isChatOnline(chat.id)) });
  res.status(201).json({ data: saved });
});

router.post('/:id/read', validateObjectId(), async (req, res) => {
  const chat = await Chat.findByIdAndUpdate(req.params.id, { unread: 0 }, { new: true, projection: lastOnly });
  if (!chat) throw ApiError.notFound('Chat not found');
  const summary = chat.toSummary(isChatOnline(chat.id));
  notifyAdmins(EVENTS.chatUpdated, { action: 'updated', chat: summary });
  res.json({ data: summary });
});

router.delete('/:id', validateObjectId(), async (req, res) => {
  const chat = await Chat.findByIdAndDelete(req.params.id);
  if (!chat) throw ApiError.notFound('Chat not found');
  emitToChat(chat.id, EVENTS.chatClosed, {});
  notifyAdmins(EVENTS.chatUpdated, { action: 'deleted', id: chat.id });
  res.json({ data: { id: chat.id } });
});

export default router;
