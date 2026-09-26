import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Message } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectId } from '../middleware/validate.js';
import { contactSchema, messageUpdateSchema } from '../validators/schemas.js';
import { EVENTS, notifyAdmins } from '../socket/index.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many messages sent. Please try again later.' } },
});

// Public: contact form submission.
router.post('/', contactLimiter, validateBody(contactSchema), async (req, res) => {
  const { website: _honeypot, ...fields } = req.body;
  const message = await Message.create(fields);
  notifyAdmins(EVENTS.messageNew, message.toJSON());
  res.status(201).json({ data: { ok: true } });
});

// Admin-only below.
router.use(requireAuth);

router.get('/', async (req, res) => {
  const filter = {};
  if (req.query.status === 'unread') filter.read = false;
  if (req.query.status === 'read') filter.read = true;
  const [items, unread] = await Promise.all([
    Message.find(filter).sort({ createdAt: -1 }).limit(500),
    Message.countDocuments({ read: false }),
  ]);
  res.json({ data: items, meta: { unread } });
});

router.patch('/:id', validateObjectId(), validateBody(messageUpdateSchema), async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, { read: req.body.read }, { new: true });
  if (!message) throw ApiError.notFound('Message not found');
  notifyAdmins(EVENTS.messageChanged, { action: 'updated', item: message.toJSON() });
  res.json({ data: message });
});

router.delete('/:id', validateObjectId(), async (req, res) => {
  const message = await Message.findByIdAndDelete(req.params.id);
  if (!message) throw ApiError.notFound('Message not found');
  notifyAdmins(EVENTS.messageChanged, { action: 'deleted', id: message.id });
  res.json({ data: { id: message.id } });
});

export default router;
