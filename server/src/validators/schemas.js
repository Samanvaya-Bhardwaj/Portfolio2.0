import { z } from 'zod';

// ── Primitives ────────────────────────────────────────────────────────────
const text = (max = 200) => z.string().trim().max(max);
const requiredText = (max = 200) => text(max).min(1, 'Required');
const textList = (maxItems = 30, maxLen = 600) => z.array(requiredText(maxLen)).max(maxItems);

/** http(s) URL, site-relative path ("/resume.pdf") or empty. Blocks javascript:/data: URLs. */
const safeUrl = text(500).refine(
  (v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v) || /^\/[^\s/][^\s]*$/.test(v),
  'Must be an http(s) URL or a site-relative path',
);

const yearMonth = text(7).refine((v) => v === '' || /^\d{4}-(0[1-9]|1[0-2])$/.test(v), 'Use YYYY-MM');
/** Integer that may be cleared: '' / null become null so the stored value is unset. */
const nullableInt = (min, max) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : v),
    z.coerce.number().int().min(min).max(max).nullable(),
  );
const year = nullableInt(1950, 2100);
const teamSize = nullableInt(1, 100);

const display = {
  order: z.coerce.number().int().min(0).max(10_000).default(0),
  visible: z.boolean().default(true),
};

// ── Auth ──────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required').max(200),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10, 'Use at least 10 characters').max(200),
});

// ── Profile ───────────────────────────────────────────────────────────────
export const profileSchema = z.object({
  name: requiredText(100),
  headline: text(200).default(''),
  roles: textList(8, 80).default([]),
  summary: text(3000).default(''),
  email: z.union([z.literal(''), z.string().trim().email()]).default(''),
  location: text(120).default(''),
  currentFocus: text(200).default(''),
  resumeUrl: safeUrl.default(''),
  socials: z
    .object({ github: safeUrl.default(''), linkedin: safeUrl.default(''), website: safeUrl.default('') })
    .default({ github: '', linkedin: '', website: '' }),
  interests: textList(20, 120).default([]),
  hobbies: textList(20, 120).default([]),
  stats: z.array(z.object({ label: requiredText(60), value: requiredText(30) })).max(6).default([]),
});

// ── Content collections ───────────────────────────────────────────────────
export const skillSchema = z.object({
  name: requiredText(60),
  category: requiredText(60),
  ...display,
});

export const educationSchema = z.object({
  institution: requiredText(150),
  degree: requiredText(150),
  startYear: year,
  endYear: year,
  current: z.boolean().default(false),
  scoreLabel: text(40).default(''),
  score: text(40).default(''),
  scoreNote: text(80).default(''),
  coursework: textList(30, 120).default([]),
  ...display,
});

export const experienceSchema = z.object({
  role: requiredText(120),
  organization: requiredText(120),
  startDate: yearMonth.default(''),
  endDate: yearMonth.default(''),
  current: z.boolean().default(false),
  guide: text(120).default(''),
  teamSize,
  highlights: textList().default([]),
  subProjects: z
    .array(z.object({ title: requiredText(120), description: text(800).default('') }))
    .max(10)
    .default([]),
  tech: textList(30, 60).default([]),
  ...display,
});

export const projectSchema = z.object({
  title: requiredText(160),
  summary: text(500).default(''),
  startDate: yearMonth.default(''),
  endDate: yearMonth.default(''),
  current: z.boolean().default(false),
  guide: text(120).default(''),
  teamSize,
  highlights: textList().default([]),
  tech: textList(30, 60).default([]),
  githubUrl: safeUrl.default(''),
  liveUrl: safeUrl.default(''),
  featured: z.boolean().default(false),
  ...display,
});

export const achievementSchema = z.object({
  title: requiredText(200),
  description: text(600).default(''),
  category: text(60).default(''),
  date: text(40).default(''),
  url: safeUrl.default(''),
  ...display,
});

// ── Messages ──────────────────────────────────────────────────────────────
export const contactSchema = z.object({
  name: requiredText(100),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(200),
  subject: text(160).default(''),
  message: requiredText(5000).min(10, 'Message should be at least 10 characters'),
  // Honeypot: real users never see or fill this field.
  website: z.string().max(0, 'Spam detected').optional(),
});

export const messageUpdateSchema = z.object({ read: z.boolean() });

/**
 * Partial variant for PATCH-style updates: every field optional and no defaults applied,
 * so omitted fields are left untouched in the database.
 */
export function toUpdateSchema(schema) {
  const shape = Object.fromEntries(
    Object.entries(schema.shape).map(([key, field]) => {
      let inner = field;
      while (inner instanceof z.ZodDefault || inner instanceof z.ZodOptional) {
        inner = inner.unwrap();
      }
      return [key, inner.optional()];
    }),
  );
  return z.object(shape);
}

// ── Live chat ─────────────────────────────────────────────────────────────
export const chatSendSchema = z.object({
  token: z.string().max(100).nullish(),
  name: text(60).default(''),
  email: z.union([z.literal(''), z.string().trim().toLowerCase().email('Enter a valid email').max(200)]).default(''),
  text: requiredText(1000),
});

export const chatReplySchema = z.object({ text: requiredText(2000) });
