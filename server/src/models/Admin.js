import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { baseOptions } from './plugins.js';

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, trim: true, default: 'Admin' },
    passwordHash: { type: String, required: true, select: false },
    lastLoginAt: Date,
  },
  {
    ...baseOptions,
    toJSON: {
      ...baseOptions.toJSON,
      transform: (doc, ret) => {
        baseOptions.toJSON.transform(doc, ret);
        delete ret.passwordHash;
        return ret;
      },
    },
  },
);

adminSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

adminSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

export const Admin = mongoose.model('Admin', adminSchema);
