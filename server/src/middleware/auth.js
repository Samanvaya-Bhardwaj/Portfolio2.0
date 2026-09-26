import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export function signToken(admin) {
  return jwt.sign({ sub: admin.id, email: admin.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

/** Returns the decoded payload, or null for a missing/invalid/expired token. */
export function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch {
    return null;
  }
}

function extractBearer(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
}

/** Rejects the request unless it carries a valid admin JWT. */
export async function requireAuth(req, _res, next) {
  const payload = verifyToken(extractBearer(req));
  if (!payload) return next(ApiError.unauthorized('Invalid or expired session'));

  const admin = await Admin.findById(payload.sub);
  if (!admin) return next(ApiError.unauthorized('Account no longer exists'));

  req.admin = admin;
  next();
}

/** Sets `req.isAdmin` when a valid token is present but never rejects. */
export function optionalAuth(req, _res, next) {
  req.isAdmin = Boolean(verifyToken(extractBearer(req)));
  next();
}
