import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError.js';

/** Validates and sanitizes `req.body` against a zod schema. Unknown keys are stripped. */
export const validateBody = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.message,
    }));
    return next(ApiError.badRequest('Validation failed', details));
  }
  req.body = result.data;
  next();
};

export const validateObjectId = (param = 'id') => (req, _res, next) => {
  if (!mongoose.isValidObjectId(req.params[param])) {
    return next(ApiError.badRequest(`Invalid ${param}`));
  }
  next();
};
