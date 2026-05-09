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

// Run standalone when executed directly (node dist/index.js or tsx src/index.ts)
const __filename = fileURLToPath(import.meta.url);
const isMain =
  process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(__filename);

if (isMain) {
  const config = parseConfig();
  startServer(config)
    .then(() => {
      console.log(`mDocs server listening at http://${config.host}:${config.port}`);
    })
    .catch((err: Error) => {
      console.error('Failed to start server:', err.message);
      process.exit(1);
    });
}
