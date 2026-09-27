import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { verifyToken } from '../middleware/auth.js';
import { chatFileUpload } from '../middleware/upload.js';
import { validateBody } from '../middleware/validate.js';
import { chatVisitorUploadSchema } from '../validators/schemas.js';
import { chatExpired, findChatByToken, postVisitorMessage } from '../services/chat.js';
import { deleteChatFile, findChatFile, openChatFileStream, saveChatFile } from '../services/chatFiles.js';
import { announceChatMessage } from '../socket/index.js';
import { ApiError } from '../utils/ApiError.js';

// Public chat endpoints. Visitors prove ownership of a conversation with their session
// token (X-Chat-Token header); admins use their usual bearer JWT.
const router = Router();

const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many uploads. Please try again in a few minutes.' } },
});

const chatTokenFrom = (req) => req.get('x-chat-token') || null;
const isAdminRequest = (req) => {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && Boolean(verifyToken(token));
};

// Visitor sends a file. Without a token this starts a new conversation, like a first text message.
router.post('/files', uploadLimiter, chatFileUpload, validateBody(chatVisitorUploadSchema), async (req, res) => {
  const token = chatTokenFrom(req);
  let chatId;
  if (token) {
    const chat = await findChatByToken(token, { _id: 1 });
    if (!chat) throw chatExpired();
    chatId = chat.id;
  } else {
    chatId = new mongoose.Types.ObjectId();
  }

  const attachment = await saveChatFile(chatId, req.chatFile);
  let result;
  try {
    const { name, email, text } = req.body;
    result = await postVisitorMessage({ token, name, email, text, attachment, ip: req.ip, chatId });
  } catch (err) {
    await deleteChatFile(attachment.fileId);
    throw err;
  }

  announceChatMessage(result);
  res.status(201).json({
    data: { chatId: result.chat.id, message: result.saved, ...(result.issuedToken && { token: result.issuedToken }) },
  });
});

// Download — for an admin, or for the visitor whose conversation the file belongs to.
router.get('/files/:fileId', async (req, res) => {
  const file = await findChatFile(req.params.fileId);
  if (!file) throw ApiError.notFound('File not found');

  if (!isAdminRequest(req)) {
    const chat = await findChatByToken(chatTokenFrom(req), { _id: 1 });
    if (!chat || chat.id !== file.metadata?.chatId) throw ApiError.notFound('File not found');
  }

  // Always a download with a server-chosen type, and sandboxed in case it's ever opened directly.
  res.set({
    'Content-Type': file.metadata?.type || 'application/octet-stream',
    'Content-Length': String(file.length),
    'Content-Disposition': `attachment; filename="${file.filename.replace(/[^\x20-\x7e]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(file.filename)}`,
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Cache-Control': 'private, no-store',
  });
  openChatFileStream(file._id)
    .on('error', () => res.destroy())
    .pipe(res);
});

export default router;
