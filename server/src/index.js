import http from 'node:http';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { createApp } from './app.js';
import { initSocket } from './socket/index.js';
import { startChatFileSweep } from './services/chatFiles.js';

async function start() {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);
  const io = initSocket(server);
  startChatFileSweep();

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') console.error(`[server] port ${env.port} is already in use — set PORT in server/.env`);
    else console.error('[server]', err);
    process.exit(1);
  });

  server.listen(env.port, () => {
    console.info(`[server] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.info(`[server] ${signal} received, shutting down`);
    io.close();
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('[server] failed to start:', err.message);
  process.exit(1);
});
