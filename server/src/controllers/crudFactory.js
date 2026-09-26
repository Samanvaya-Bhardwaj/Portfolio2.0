import { ApiError } from '../utils/ApiError.js';
import { broadcastContent } from '../socket/index.js';

export const DEFAULT_SORT = { order: 1, createdAt: -1 };

/**
 * Builds list/get/create/update/remove handlers for an orderable content model.
 * Every write is persisted first, then broadcast over Socket.IO.
 */
export function crudController(Model, resource) {
  return {
    async list(req, res) {
      const filter = req.isAdmin ? {} : { visible: true };
      const items = await Model.find(filter).sort(DEFAULT_SORT);
      res.json({ data: items });
    },

    async get(req, res) {
      const item = await Model.findById(req.params.id);
      if (!item || (!item.visible && !req.isAdmin)) throw ApiError.notFound();
      res.json({ data: item });
    },

    async create(req, res) {
      const item = await Model.create(req.body);
      broadcastContent(resource, 'created', { item: item.toJSON() });
      res.status(201).json({ data: item });
    },

    async update(req, res) {
      const item = await Model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
      if (!item) throw ApiError.notFound();
      broadcastContent(resource, 'updated', { item: item.toJSON() });
      res.json({ data: item });
    },

    async remove(req, res) {
      const item = await Model.findByIdAndDelete(req.params.id);
      if (!item) throw ApiError.notFound();
      broadcastContent(resource, 'deleted', { id: item.id });
      res.json({ data: { id: item.id } });
    },
  };
}
