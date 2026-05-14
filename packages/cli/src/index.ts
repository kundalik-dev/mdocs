#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { Command } from 'commander';
import { DEFAULT_START_PORT, start } from './commands/start.js';
import { runSetup } from './commands/setup.js';

const program = new Command();
const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
) as { version: string };

program
  .name('modcs')
  .description('mDocs — local documentation server')
  .version(packageJson.version);

program
  .command('start')
  .description('Start the mDocs local server')
  .option('-p, --port <port>', 'Port to listen on', DEFAULT_START_PORT)
  .option('-H, --host <host>', 'Host to bind to', '127.0.0.1')
  .option('-d, --data-dir <dir>', 'Directory that holds (or will hold) .mdocs/')
  .option('-o, --origin <origin>', 'Allowed CORS origin')
  .option('-t, --github-token <token>', 'GitHub PAT for cloning private repositories (or set GITHUB_TOKEN env var)')
  .action(start);

program
  .command('setup')
  .description('Initialize .mdocs/ project structure in the current directory')
  .option('-d, --data-dir <dir>', 'Target directory (defaults to cwd)')
  .action((opts) => runSetup(opts.dataDir));

program.parse();
