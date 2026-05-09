import { Router, type Request, type Response } from 'express';
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, FileContent } from '../types.js';
import { reposDir as getReposDir } from '../config.js';
import { getRepo } from '../services/repo-store.js';
import { scanMarkdownFiles } from '../services/scanner.js';
import { safeResolve } from '../security/paths.js';

export function filesRouter(config: Config): Router {
  // mergeParams lets us read :repoId from the parent router
  const router = Router({ mergeParams: true });
  const reposDir = getReposDir(config.dataDir);

  // Handles both GET /  (list) and GET /path/to/file.md (read)
  router.get('*', (req: Request, res: Response) => {
    const { repoId } = req.params as { repoId: string };

    if (!getRepo(reposDir, repoId)) {
      res.status(404).json({ error: 'Repository not found' });
      return;
    }

    const cloneDir = join(reposDir, repoId);
    // req.path is relative to this router's mount point
    const relPath = req.path === '/' ? '' : decodeURIComponent(req.path.slice(1));

    if (!relPath) {
      res.json(scanMarkdownFiles(cloneDir, repoId));
      return;
    }

    const absPath = safeResolve(cloneDir, relPath);
    if (!absPath) {
      res.status(400).json({ error: 'Invalid file path' });
      return;
    }

    if (!existsSync(absPath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    try {
      const stat = statSync(absPath);
      const content = readFileSync(absPath, 'utf8');

      const file: FileContent = {
        id: relPath,
        repoId,
        name: relPath.split('/').pop() ?? relPath,
        relPath,
        size: stat.size,
        lastModified: stat.mtimeMs,
        content,
      };

      res.json(file);
    } catch {
      res.status(500).json({ error: 'Failed to read file' });
    }
  });

  return router;
}
