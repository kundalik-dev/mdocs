import cors from 'cors';
import type { Config } from '../types.js';

export function createCorsMiddleware(config: Config) {
  return cors({
    origin: (origin, cb) => {
      // allow requests with no Origin header (curl, same-origin)
      if (!origin) return cb(null, true);
      if (config.origins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} is not allowed`));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  });
}
