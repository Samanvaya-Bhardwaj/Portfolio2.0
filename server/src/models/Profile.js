import mongoose from 'mongoose';
import { baseOptions } from './plugins.js';

const statSchema = new mongoose.Schema(
  { label: { type: String, trim: true }, value: { type: String, trim: true } },
  { _id: false },
);

/** Singleton document holding hero / about / contact information. */
const profileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    headline: { type: String, trim: true, default: '' },
    roles: [{ type: String, trim: true }],
    summary: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    currentFocus: { type: String, trim: true, default: '' },
    resumeUrl: { type: String, trim: true, default: '' },
    socials: {
      github: { type: String, trim: true, default: '' },
      linkedin: { type: String, trim: true, default: '' },
      website: { type: String, trim: true, default: '' },
    },
    interests: [{ type: String, trim: true }],
    hobbies: [{ type: String, trim: true }],
    stats: [statSchema],
  },
  baseOptions,
);

export const Profile = mongoose.model('Profile', profileSchema);
