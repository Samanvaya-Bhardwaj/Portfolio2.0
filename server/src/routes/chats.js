import { Router } from 'express';
import { Chat } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { chatFileUpload } from '../middleware/upload.js';
import { validateBody, validateObjectId } from '../middleware/validate.js';
import { chatAdminUploadSchema, chatReplySchema } from '../validators/schemas.js';
import { postAdminMessage } from '../services/chat.js';
import { deleteChatFile, deleteChatFiles, saveChatFile } from '../services/chatFiles.js';
import { EVENTS, announceChatMessage, emitToChat, isChatOnline, notifyAdmins } from '../socket/index.js';
import { ApiError } from '../utils/ApiError.js';

// Admin side of live chat. Visitors talk over Socket.IO (see socket/chat.js); file
// downloads for both sides live in routes/chatFiles.js.
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
  const result = await postAdminMessage(req.params.id, { text: req.body.text });
  announceChatMessage(result);
  res.status(201).json({ data: result.saved });
});

router.post('/:id/files', validateObjectId(), chatFileUpload, validateBody(chatAdminUploadSchema), async (req, res) => {
  if (!(await Chat.exists({ _id: req.params.id }))) throw ApiError.notFound('Chat not found');
  const attachment = await saveChatFile(req.params.id, req.chatFile);
  let result;
  try {
    result = await postAdminMessage(req.params.id, { text: req.body.text, attachment });
  } catch (err) {
    await deleteChatFile(attachment.fileId);
    throw err;
  }
  announceChatMessage(result);
  res.status(201).json({ data: result.saved });
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
  await deleteChatFiles(chat.id);
  emitToChat(chat.id, EVENTS.chatClosed, {});
  notifyAdmins(EVENTS.chatUpdated, { action: 'deleted', id: chat.id });
  res.json({ data: { id: chat.id } });
});

export default router;
