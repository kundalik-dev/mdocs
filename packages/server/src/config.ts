import { resolve } from "node:path";
import { homedir } from "node:os";
import type { Config } from "./types.js";

export const DEFAULT_PORT = 5540;
export const DEFAULT_HOST = "127.0.0.1";
export const MDOCS_DIR = ".mdocs";
export const REPOS_SUBDIR = "repos";

export const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://mdocs-reader.vercel.app", 
];

export function parseConfig(overrides: Partial<Config> = {}): Config {
  return {
    port:
      overrides.port ??
      parseInt(process.env["PORT"] ?? String(DEFAULT_PORT), 10),
    host: overrides.host ?? process.env["HOST"] ?? DEFAULT_HOST,
    dataDir: overrides.dataDir ?? process.env["DATA_DIR"] ?? homedir(),
    origins: overrides.origins ?? DEFAULT_ORIGINS,
    githubToken: overrides.githubToken ?? process.env["GITHUB_TOKEN"],
  };
}

export function reposDir(dataDir: string): string {
  return resolve(dataDir, MDOCS_DIR, REPOS_SUBDIR);
}
