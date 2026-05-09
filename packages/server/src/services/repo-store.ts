import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { RepoMeta } from '../types.js';

export function listRepos(reposDir: string): RepoMeta[] {
  if (!existsSync(reposDir)) return [];

  return readdirSync(reposDir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((f) => {
      try {
        return [JSON.parse(readFileSync(join(reposDir, f), 'utf8')) as RepoMeta];
      } catch {
        return [];
      }
    });
}

export function getRepo(reposDir: string, id: string): RepoMeta | null {
  // guard against path traversal in id
  if (id.includes('/') || id.includes('\\') || id.includes('..')) return null;

  const file = join(reposDir, `${id}.json`);
  if (!existsSync(file)) return null;

  try {
    return JSON.parse(readFileSync(file, 'utf8')) as RepoMeta;
  } catch {
    return null;
  }
}

export function saveRepo(reposDir: string, meta: RepoMeta): void {
  writeFileSync(join(reposDir, `${meta.id}.json`), JSON.stringify(meta, null, 2), 'utf8');
}

export function deleteRepo(reposDir: string, id: string): void {
  if (id.includes('/') || id.includes('\\') || id.includes('..')) return;

  const metaFile = join(reposDir, `${id}.json`);
  const cloneDir = join(reposDir, id);

  if (existsSync(metaFile)) unlinkSync(metaFile);
  if (existsSync(cloneDir)) rmSync(cloneDir, { recursive: true, force: true });
}
