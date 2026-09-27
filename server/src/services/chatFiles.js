import path from 'node:path';
import { finished } from 'node:stream/promises';
import mongoose from 'mongoose';
import { Chat } from '../models/index.js';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;
const SWEEP_GRACE_MS = 60 * 60 * 1000; // never touch files young enough to be mid-upload

const startsWith = (buf, bytes) => bytes.every((b, i) => buf[i] === b);

/**
 * Allowed file kinds. The extension picks the kind and the content must match it,
 * so a renamed executable or HTML page is rejected. The served Content-Type comes from
 * this table, never from the client.
 */
const KINDS = [
  { ext: ['pdf'], type: 'application/pdf', sniff: (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]) },
  { ext: ['png'], type: 'image/png', sniff: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { ext: ['jpg', 'jpeg'], type: 'image/jpeg', sniff: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  {
    ext: ['webp'],
    type: 'image/webp',
    sniff: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  {
    ext: ['docx'],
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sniff: (b) => startsWith(b, [0x50, 0x4b, 0x03, 0x04]),
  },
  { ext: ['doc'], type: 'application/msword', sniff: (b) => startsWith(b, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) },
  { ext: ['txt'], type: 'text/plain; charset=utf-8', sniff: (b) => !b.includes(0) },
];

export const ALLOWED_EXTENSIONS = KINDS.flatMap((k) => k.ext);

/** Returns the matching kind, or null when the extension isn't allowed or the bytes don't match it. */
export function identifyFile(name, buffer) {
  const ext = path.extname(name).slice(1).toLowerCase();
  const kind = KINDS.find((k) => k.ext.includes(ext));
  return kind && buffer.length > 0 && kind.sniff(buffer) ? kind : null;
}

/** Display name: no path parts or control characters, bounded length, extension kept. */
export function cleanFileName(name) {
  const base = path.basename(String(name).replace(/\\/g, '/')).replace(/[\u0000-\u001f\u007f"]/g, '').trim();
  if (base.length <= 120) return base || 'file';
  const ext = path.extname(base);
  return base.slice(0, 120 - ext.length) + ext;
}

let bucket;
const getBucket = () => (bucket ??= new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'chatFiles' }));

/** Stores an already-validated upload and returns the attachment to put on a message. */
export async function saveChatFile(chatId, { name, buffer, kind }) {
  const stream = getBucket().openUploadStream(name, { metadata: { chatId: String(chatId), type: kind.type } });
  stream.end(buffer);
  await finished(stream);
  return { fileId: stream.id, name, size: buffer.length, type: kind.type };
}

/** Looks up a stored file; returns null when it doesn't exist. */
export async function findChatFile(fileId) {
  if (!mongoose.isValidObjectId(fileId)) return null;
  const [file] = await getBucket().find({ _id: new mongoose.Types.ObjectId(String(fileId)) }).limit(1).toArray();
  return file ?? null;
}

export const openChatFileStream = (fileId) => getBucket().openDownloadStream(fileId);

export async function deleteChatFile(fileId) {
  await getBucket()
    .delete(fileId)
    .catch(() => {});
}

export async function deleteChatFiles(chatId) {
  const files = await getBucket().find({ 'metadata.chatId': String(chatId) }).toArray();
  await Promise.all(files.map((f) => deleteChatFile(f._id)));
}

/** Removes files whose conversation is gone (deleted, or expired by the chat TTL index). */
async function sweepOrphans() {
  const cutoff = new Date(Date.now() - SWEEP_GRACE_MS);
  const files = await getBucket().find({ uploadDate: { $lt: cutoff } }, { projection: { metadata: 1 } }).toArray();
  if (!files.length) return;
  const chatIds = [...new Set(files.map((f) => f.metadata?.chatId).filter(mongoose.isValidObjectId))];
  const alive = new Set((await Chat.find({ _id: { $in: chatIds } }).distinct('_id')).map(String));
  const orphans = files.filter((f) => !alive.has(f.metadata?.chatId));
  await Promise.all(orphans.map((f) => deleteChatFile(f._id)));
  if (orphans.length) console.info(`[chat] removed ${orphans.length} orphaned file(s)`);
}

export function startChatFileSweep() {
  const run = () => sweepOrphans().catch((err) => console.error('[chat] file sweep failed:', err.message));
  setTimeout(run, 60_000).unref();
  setInterval(run, SWEEP_EVERY_MS).unref();
}
