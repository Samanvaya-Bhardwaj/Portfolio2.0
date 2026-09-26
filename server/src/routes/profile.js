import { Router } from 'express';
import { Profile } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { profileSchema } from '../validators/schemas.js';
import { broadcastContent } from '../socket/index.js';
import { ApiError } from '../utils/ApiError.js';

const router = Router();

router.get('/', async (_req, res) => {
  const profile = await Profile.findOne();
  if (!profile) throw ApiError.notFound('Profile has not been created yet. Run the seed script.');
  res.json({ data: profile });
});

// The profile is a singleton, so PUT replaces it wholesale (upserting on first save).
router.put('/', requireAuth, validateBody(profileSchema), async (req, res) => {
  const profile = await Profile.findOneAndUpdate({}, req.body, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
  });
  broadcastContent('profile', 'updated', { item: profile.toJSON() });
  res.json({ data: profile });
});

export default router;
