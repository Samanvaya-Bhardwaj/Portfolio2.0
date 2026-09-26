import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');

export function createApp() {
  const app = express();

  app.set('trust proxy', 1); // correct client IPs for rate limiting behind Nginx / a PaaS proxy
  app.disable('x-powered-by');

  app.use(
    helmet({
      // The SPA is served by Vite in development; in production CSP is tuned for the built bundle.
      contentSecurityPolicy: env.isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com'],
              imgSrc: ["'self'", 'data:', 'blob:'],
              connectSrc: ["'self'", 'ws:', 'wss:', ...env.clientOrigins],
            },
          }
        : false,
    }),
  );
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  if (!env.isProd) app.use(morgan('dev'));

  app.use('/api', apiRoutes);
  app.use('/api', notFound);

  // In production, serve the built React app from the same origin.
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist, { maxAge: '1y', index: false }));
    app.get(/^(?!\/api|\/socket\.io).*/, (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
