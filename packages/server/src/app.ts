import express, { type Express } from 'express';
import type { Config } from './types.js';
import { createCorsMiddleware } from './security/cors.js';
import { healthRouter } from './routes/health.js';
import { reposRouter } from './routes/repos.js';

export function createApp(config: Config): Express {
  const app = express();

  app.use(createCorsMiddleware(config));
  app.use(express.json());

  app.use('/health', healthRouter());
  app.use('/api/repos', reposRouter(config));

  // 404 catch-all
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
