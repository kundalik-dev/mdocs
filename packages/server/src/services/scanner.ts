import { readdirSync, statSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import type { FileRef } from '../types.js';

const SKIP_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', '.turbo', 'vendor', '.cache',
]);
const MD_EXTS = new Set(['.md', '.markdown', '.mdx']);
const MAX_FILE_SIZE = 1024 * 1024; // 1 MB

export function scanMarkdownFiles(repoPath: string, repoId: string): FileRef[] {
  const results: FileRef[] = [];

  function walk(dir: string): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;

      const fullPath = join(dir, entry);

      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!stat.isFile()) continue;
      if (!MD_EXTS.has(extname(entry).toLowerCase())) continue;
      if (stat.size > MAX_FILE_SIZE) continue;

      const relPath = relative(repoPath, fullPath).replace(/\\/g, '/');
      results.push({
        id: relPath,
        repoId,
        name: basename(entry),
        relPath,
        size: stat.size,
        lastModified: stat.mtimeMs,
      });
    }
  }

  walk(repoPath);
  return results;
}
