import { existsSync, mkdirSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { homedir } from 'node:os';

export const MDOCS_DIR = '.mdocs';
export const REPOS_DIR = join(MDOCS_DIR, 'repos');

export function defaultDataDir(): string {
  return homedir();
}

export function mdocsExists(cwd: string): boolean {
  return existsSync(join(cwd, MDOCS_DIR));
}

export function reposDirExists(cwd: string): boolean {
  return existsSync(join(cwd, REPOS_DIR));
}

export function createMdocsStructure(cwd: string): void {
  mkdirSync(join(cwd, REPOS_DIR), { recursive: true });
}

export function resolveDataDir(dataDir?: string): string {
  if (!dataDir) return homedir();
  return isAbsolute(dataDir) ? dataDir : join(process.cwd(), dataDir);
}
