export interface RepoMeta {
  id: string;
  name: string;
  url: string;
  branch: string;
  clonedAt: string;
  lastSyncedAt: string | null;
  currentCommit: string | null;
  fileCount: number;
}
