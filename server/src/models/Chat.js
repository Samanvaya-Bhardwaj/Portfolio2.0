import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { baseOptions } from './plugins.js';

/** Older messages are trimmed once a conversation grows past this. */
export const CHAT_HISTORY_LIMIT = 500;
/** Conversations with no activity for this long are removed by a TTL index. */
const CHAT_TTL_SECONDS = 60 * 60 * 24 * 90;

/** A file stored in GridFS (bucket `chatFiles`), referenced from a message. */
const attachmentSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    size: { type: Number, required: true },
    type: { type: String, required: true },
  },
  { _id: false },
);

const chatMessageSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ['visitor', 'admin'], required: true },
    text: { type: String, trim: true, default: '' },
    attachment: { type: attachmentSchema, default: undefined },
    at: { type: Date, default: Date.now },
  },
  { toJSON: baseOptions.toJSON },
);

const chatSchema = new mongoose.Schema(
  {
    // SHA-256 of the visitor's session token. The raw token only ever lives in their browser.
    tokenHash: { type: String, required: true, unique: true, select: false },
    name: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    messages: { type: [chatMessageSchema], default: [] },
    unread: { type: Number, default: 0 }, // visitor messages the admin hasn't seen yet
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    ...baseOptions,
    toJSON: {
      ...baseOptions.toJSON,
      // `select: false` only covers queries; a freshly created doc still carries the hash.
      transform: (doc, ret, options) => {
        delete ret.tokenHash;
        return baseOptions.toJSON.transform(doc, ret, options);
      },
    },
  },
);

chatSchema.index({ lastMessageAt: 1 }, { expireAfterSeconds: CHAT_TTL_SECONDS });

/** List-row shape for the admin inbox: everything but the full history. */
chatSchema.methods.toSummary = function toSummary(online = false) {
  const { messages, ...rest } = this.toJSON();
  return { ...rest, lastMessage: messages.at(-1) ?? null, online };
};

/** What the visitor's own browser gets back. */
chatSchema.methods.toVisitorView = function toVisitorView() {
  const { id, name, email, messages } = this.toJSON();
  return { id, name, email, messages };
};

export const newChatToken = () => crypto.randomBytes(24).toString('base64url');
export const hashChatToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

export const Chat = mongoose.model('Chat', chatSchema);
