import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import type { Server } from 'node:http';
import { createApp } from './app.js';
import { parseConfig } from './config.js';
import type { Config } from './types.js';

export { createApp } from './app.js';
export { parseConfig, DEFAULT_PORT, DEFAULT_HOST, DEFAULT_ORIGINS, reposDir } from './config.js';
export type { RepoMeta, FileRef, FileContent, Config } from './types.js';

export async function startServer(overrides: Partial<Config> = {}): Promise<Server> {
  const config = parseConfig(overrides);
  const app = createApp(config);

  return new Promise((resolve_, reject) => {
    const server = app.listen(config.port, config.host, () => resolve_(server));
    server.on('error', reject);
  });
}

