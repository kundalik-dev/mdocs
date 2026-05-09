import chalk from 'chalk';
import open from 'open';
import { startServer, DEFAULT_ORIGINS } from '@mdocs/server';
import { mdocsExists, reposDirExists, resolveDataDir } from '../lib/mdocs.js';
import { runSetup } from './setup.js';
import { printBanner } from '../lib/banner.js';

const VIEWER_URL = 'https://idocs-md-viewer.vercel.app/';

export interface ServeOptions {
  port: string;
  host: string;
  dataDir?: string;
  origin?: string;
  githubToken?: string;
}

export async function serve(options: ServeOptions): Promise<void> {
  const cwd = resolveDataDir(options.dataDir);
  const port = parseInt(options.port, 10);
  const host = options.host;

  if (!mdocsExists(cwd) || !reposDirExists(cwd)) {
    await runSetup(cwd);
  }

  console.log(chalk.dim(`\n  Starting server on ${host}:${port}...\n`));

  const origins = options.origin
    ? [options.origin, ...DEFAULT_ORIGINS]
    : DEFAULT_ORIGINS;

  const server = await startServer({ port, host, dataDir: cwd, origins, githubToken: options.githubToken });

  printBanner();

  console.log(
    chalk.bold('  Server running at ') +
      chalk.bold.underline.cyan(`http://${host}:${port}`),
  );
  console.log(chalk.dim(`  Health: http://${host}:${port}/health`));
  if (options.origin) {
    console.log(chalk.dim(`  CORS origin: ${options.origin}`));
  }
  console.log(chalk.dim(`  Opening ${VIEWER_URL}`));
  console.log(chalk.dim('\n  Press Ctrl+C to stop.\n'));

  void open(VIEWER_URL);

  process.on('SIGINT', () => {
    console.log(chalk.dim('\n  Stopping mDocs server…\n'));
    server.close(() => process.exit(0));
  });
}
