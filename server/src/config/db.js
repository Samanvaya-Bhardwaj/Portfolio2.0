import mongoose from 'mongoose';
import { env } from './env.js';

mongoose.set('strictQuery', true);

export async function connectDB() {
  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected', () => console.info('[db] reconnected'));
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.info(`[db] connected to "${mongoose.connection.name}"`);
  return mongoose.connection;
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
