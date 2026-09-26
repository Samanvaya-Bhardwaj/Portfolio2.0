/**
 * Seeds the database with resume content and creates/updates the admin account.
 *
 *   npm run seed          → inserts content only into empty collections (safe to re-run)
 *   npm run seed:reset    → wipes content collections and re-inserts everything
 *
 * Contact messages are never touched.
 */
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Admin, Profile, Skill, Education, Experience, Project, Achievement } from '../models/index.js';
import * as data from './data.js';

const reset = process.argv.includes('--reset');

const collections = [
  ['skills', Skill, data.skills],
  ['education', Education, data.education],
  ['experience', Experience, data.experience],
  ['projects', Project, data.projects],
  ['achievements', Achievement, data.achievements],
];

async function seedAdmin() {
  const { email, password, name } = env.admin;
  if (!email || !password) {
    console.warn('  ! ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account');
    return;
  }
  if (password.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');

  const passwordHash = await Admin.hashPassword(password);
  await Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), name, passwordHash },
    { upsert: true, setDefaultsOnInsert: true },
  );
  console.info(`  ✓ admin account ready (${email.toLowerCase()})`);
}

async function seedProfile() {
  if (reset) await Profile.deleteMany({});
  if (await Profile.exists({})) return console.info('  · profile exists — skipped');
  await Profile.create(data.profile);
  console.info('  ✓ profile');
}

async function seedCollection(label, Model, docs) {
  if (reset) await Model.deleteMany({});
  const count = await Model.countDocuments();
  if (count > 0) return console.info(`  · ${label}: ${count} existing — skipped`);
  await Model.insertMany(docs);
  console.info(`  ✓ ${label}: ${docs.length} inserted`);
}

async function main() {
  await connectDB();
  console.info(reset ? 'Seeding (reset mode)…' : 'Seeding…');
  await seedAdmin();
  await seedProfile();
  for (const [label, Model, docs] of collections) {
    await seedCollection(label, Model, docs);
  }
  console.info('Done.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(disconnectDB);
