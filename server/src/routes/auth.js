import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { Admin } from '../models/index.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema } from '../validators/schemas.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { message: 'Too many login attempts. Try again in 15 minutes.' } },
});

router.post('/login', loginLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email }).select('+passwordHash');

  // Same response for unknown email and wrong password to avoid account enumeration.
  if (!admin || !(await admin.verifyPassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  res.json({ data: { token: signToken(admin), admin: admin.toJSON() } });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ data: { admin: req.admin } });
});

router.post('/change-password', requireAuth, validateBody(changePasswordSchema), async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select('+passwordHash');
  if (!(await admin.verifyPassword(req.body.currentPassword))) {
    throw ApiError.badRequest('Current password is incorrect');
  }
  admin.passwordHash = await Admin.hashPassword(req.body.newPassword);
  await admin.save();
  res.json({ data: { ok: true } });
});

export default router;
