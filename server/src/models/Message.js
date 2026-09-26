import mongoose from 'mongoose';
import { baseOptions } from './plugins.js';

const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    subject: { type: String, trim: true, default: '' },
    message: { type: String, required: true, trim: true },
    read: { type: Boolean, default: false, index: true },
  },
  baseOptions,
);

messageSchema.index({ createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
