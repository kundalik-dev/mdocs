import chalk from 'chalk';
import { createMdocsStructure, MDOCS_DIR, REPOS_DIR, resolveDataDir } from '../lib/mdocs.js';

export async function runSetup(cwd?: string): Promise<void> {
  const dir = resolveDataDir(cwd);

  console.log(chalk.dim('\n  Setting up mDocs project structure...\n'));

  createMdocsStructure(dir);

  console.log(chalk.green('  ✓') + chalk.white(`  ${MDOCS_DIR}/`));
  console.log(chalk.green('  ✓') + chalk.white(`  ${REPOS_DIR}/`));
  console.log(chalk.bold.green('\n  mDocs initialized successfully!\n'));
}
