import { Router, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Config, RepoMeta } from '../types.js';
import { reposDir as getReposDir } from '../config.js';
import { validateGitHubUrl } from '../security/github-url.js';
import { cloneRepo, pullRepo, getHeadCommit, getDefaultBranch } from '../services/git.js';
import { scanMarkdownFiles } from '../services/scanner.js';
import { listRepos, getRepo, saveRepo, deleteRepo } from '../services/repo-store.js';
import { filesRouter } from './files.js';

export function reposRouter(config: Config): Router {
  const router = Router();
  const reposDir = getReposDir(config.dataDir);

  // Mount files sub-router first (before /:repoId catch-alls)
  router.use('/:repoId/files', filesRouter(config));

  router.get('/', (_req: Request, res: Response) => {
    res.json(listRepos(reposDir));
  });

  // POST /clone must be before /:repoId routes to avoid "clone" being parsed as a repoId
  router.post('/clone', async (req: Request, res: Response) => {
    const { url, branch } = req.body as { url?: string; branch?: string };

    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: '"url" is required' });
      return;
    }

    const parsed = validateGitHubUrl(url);
    if (!parsed) {
      res.status(400).json({ error: 'Only public GitHub HTTPS URLs are supported (https://github.com/owner/repo)' });
      return;
    }

    const id = randomUUID();
    const cloneDir = join(reposDir, id);

    try {
      mkdirSync(reposDir, { recursive: true });
      await cloneRepo(url, cloneDir, branch, config.githubToken);

      const detectedBranch = branch ?? (await getDefaultBranch(cloneDir));
      const currentCommit = await getHeadCommit(cloneDir);
      const files = scanMarkdownFiles(cloneDir, id);

      const meta: RepoMeta = {
        id,
        name: `${parsed.owner}/${parsed.repo}`,
        url,
        branch: detectedBranch,
        clonedAt: new Date().toISOString(),
        lastSyncedAt: null,
        currentCommit,
        fileCount: files.length,
      };

      saveRepo(reposDir, meta);
      res.status(201).json(meta);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/:repoId/sync', async (req: Request, res: Response) => {
    const { repoId } = req.params;
    const meta = getRepo(reposDir, repoId);

    if (!meta) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    const cloneDir = join(reposDir, repoId);

    try {
      await pullRepo(cloneDir);

      const currentCommit = await getHeadCommit(cloneDir);
      const files = scanMarkdownFiles(cloneDir, repoId);

      const updated: RepoMeta = {
        ...meta,
        currentCommit,
        fileCount: files.length,
        lastSyncedAt: new Date().toISOString(),
      };

      saveRepo(reposDir, updated);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.delete('/:repoId', (req: Request, res: Response) => {
    const { repoId } = req.params;

    if (!getRepo(reposDir, repoId)) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    deleteRepo(reposDir, repoId);
    res.status(204).send();
  });

  return router;
}
