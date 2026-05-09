export interface RepoMeta {
  id: string;
  name: string; // "owner/repo"
  url: string;
  branch: string;
  clonedAt: string;
  lastSyncedAt: string | null;
  currentCommit: string | null;
  fileCount: number;
}

export interface FileRef {
  id: string; // relative path, e.g. "docs/intro.md"
  repoId: string;
  name: string;
  relPath: string;
  size: number;
  lastModified: number;
}

export interface FileContent extends FileRef {
  content: string;
}

export interface Config {
  port: number;
  host: string;
  dataDir: string;
  origins: string[];
  githubToken?: string;
}
