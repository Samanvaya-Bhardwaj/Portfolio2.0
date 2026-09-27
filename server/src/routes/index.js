import { Router } from 'express';
import mongoose from 'mongoose';
import { Profile, Skill, Education, Experience, Project, Achievement, Message, Chat } from '../models/index.js';
import {
  skillSchema,
  educationSchema,
  experienceSchema,
  projectSchema,
  achievementSchema,
} from '../validators/schemas.js';
import { DEFAULT_SORT } from '../controllers/crudFactory.js';
import { requireAuth } from '../middleware/auth.js';
import { contentRouter } from './content.js';
import authRoutes from './auth.js';
import profileRoutes from './profile.js';
import messageRoutes from './messages.js';
import chatRoutes from './chats.js';

/** Single registry of content collections — add a new section here and it gets full CRUD + sync. */
export const COLLECTIONS = [
  { resource: 'skills', model: Skill, schema: skillSchema },
  { resource: 'education', model: Education, schema: educationSchema },
  { resource: 'experience', model: Experience, schema: experienceSchema },
  { resource: 'projects', model: Project, schema: projectSchema },
  { resource: 'achievements', model: Achievement, schema: achievementSchema },
];

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down', uptime: process.uptime() });
});

/** Everything the public site needs in one round-trip. */
router.get('/portfolio', async (_req, res) => {
  const [profile, ...lists] = await Promise.all([
    Profile.findOne(),
    ...COLLECTIONS.map(({ model }) => model.find({ visible: true }).sort(DEFAULT_SORT)),
  ]);
  const data = { profile };
  COLLECTIONS.forEach(({ resource }, i) => {
    data[resource] = lists[i];
  });
  res.set('Cache-Control', 'no-cache');
  res.json({ data });
});

router.get('/admin/stats', requireAuth, async (_req, res) => {
  const counts = await Promise.all(COLLECTIONS.map(({ model }) => model.countDocuments()));
  const [messages, unread, chats, chatsUnread] = await Promise.all([
    Message.countDocuments(),
    Message.countDocuments({ read: false }),
    Chat.countDocuments(),
    Chat.countDocuments({ unread: { $gt: 0 } }),
  ]);
  const data = { messages, unread, chats, chatsUnread };
  COLLECTIONS.forEach(({ resource }, i) => {
    data[resource] = counts[i];
  });
  res.json({ data });
});

router.use('/auth', authRoutes);
router.use('/profile', profileRoutes);
router.use('/messages', messageRoutes);
router.use('/chats', chatRoutes);
COLLECTIONS.forEach((config) => router.use(`/${config.resource}`, contentRouter(config)));

export default router;
