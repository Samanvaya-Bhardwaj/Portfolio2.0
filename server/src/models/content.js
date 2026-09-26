import mongoose from 'mongoose';
import { baseOptions, displayFields } from './plugins.js';

const str = { type: String, trim: true, default: '' };
const strList = [{ type: String, trim: true }];

export const Skill = mongoose.model(
  'Skill',
  new mongoose.Schema(
    {
      name: { type: String, required: true, trim: true },
      category: { type: String, required: true, trim: true },
      ...displayFields,
    },
    baseOptions,
  ),
);

export const Education = mongoose.model(
  'Education',
  new mongoose.Schema(
    {
      institution: { type: String, required: true, trim: true },
      degree: { type: String, required: true, trim: true },
      startYear: Number,
      endYear: Number,
      current: { type: Boolean, default: false },
      scoreLabel: str,
      score: str,
      scoreNote: str,
      coursework: strList,
      ...displayFields,
    },
    baseOptions,
  ),
);

const subProjectSchema = new mongoose.Schema({ title: str, description: str }, { _id: false });

export const Experience = mongoose.model(
  'Experience',
  new mongoose.Schema(
    {
      role: { type: String, required: true, trim: true },
      organization: { type: String, required: true, trim: true },
      startDate: str, // "YYYY-MM"
      endDate: str,
      current: { type: Boolean, default: false },
      guide: str,
      teamSize: Number,
      highlights: strList,
      subProjects: [subProjectSchema],
      tech: strList,
      ...displayFields,
    },
    baseOptions,
  ),
);

export const Project = mongoose.model(
  'Project',
  new mongoose.Schema(
    {
      title: { type: String, required: true, trim: true },
      summary: str,
      startDate: str, // "YYYY-MM"
      endDate: str,
      current: { type: Boolean, default: false },
      guide: str,
      teamSize: Number,
      highlights: strList,
      tech: strList,
      githubUrl: str,
      liveUrl: str,
      featured: { type: Boolean, default: false },
      ...displayFields,
    },
    baseOptions,
  ),
);

export const Achievement = mongoose.model(
  'Achievement',
  new mongoose.Schema(
    {
      title: { type: String, required: true, trim: true },
      description: str,
      category: str,
      date: str,
      url: str,
      ...displayFields,
    },
    baseOptions,
  ),
);
