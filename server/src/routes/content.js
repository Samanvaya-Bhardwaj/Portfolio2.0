import { Router } from 'express';
import { crudController } from '../controllers/crudFactory.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { validateBody, validateObjectId } from '../middleware/validate.js';
import { toUpdateSchema } from '../validators/schemas.js';

/**
 * REST router for one content collection:
 *   GET    /        public (visible items only; admins see all)
 *   GET    /:id     public
 *   POST   /        admin
 *   PUT    /:id     admin (partial update)
 *   DELETE /:id     admin
 */
export function contentRouter({ model, schema, resource }) {
  const router = Router();
  const ctrl = crudController(model, resource);
  const updateSchema = toUpdateSchema(schema);

  router.get('/', optionalAuth, ctrl.list);
  router.get('/:id', validateObjectId(), optionalAuth, ctrl.get);
  router.post('/', requireAuth, validateBody(schema), ctrl.create);
  router.put('/:id', requireAuth, validateObjectId(), validateBody(updateSchema), ctrl.update);
  router.delete('/:id', requireAuth, validateObjectId(), ctrl.remove);

  return router;
}
