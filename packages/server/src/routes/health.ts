import { Router } from 'express';

export function healthRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    res.json({ ok: true, name: 'modcs-server', version: '0.1.4' });
  });

  return router;
}
