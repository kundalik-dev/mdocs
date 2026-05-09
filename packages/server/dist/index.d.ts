import { Server } from 'node:http';
import { Express } from 'express';

interface RepoMeta {
    id: string;
    name: string;
    url: string;
    branch: string;
    clonedAt: string;
    lastSyncedAt: string | null;
    currentCommit: string | null;
    fileCount: number;
}
interface FileRef {
    id: string;
    repoId: string;
    name: string;
    relPath: string;
    size: number;
    lastModified: number;
}
interface FileContent extends FileRef {
    content: string;
}
interface Config {
    port: number;
    host: string;
    dataDir: string;
    origins: string[];
    githubToken?: string;
}

declare function createApp(config: Config): Express;

declare const DEFAULT_PORT = 4873;
declare const DEFAULT_HOST = "127.0.0.1";
declare const DEFAULT_ORIGINS: string[];
declare function parseConfig(overrides?: Partial<Config>): Config;
declare function reposDir(dataDir: string): string;

declare function startServer(overrides?: Partial<Config>): Promise<Server>;

export { type Config, DEFAULT_HOST, DEFAULT_ORIGINS, DEFAULT_PORT, type FileContent, type FileRef, type RepoMeta, createApp, parseConfig, reposDir, startServer };
