#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/commands/serve.ts
import chalk2 from "chalk";
import open from "open";
import { startServer, DEFAULT_ORIGINS } from "@mdocs/server";

// src/lib/mdocs.ts
import { existsSync, mkdirSync } from "fs";
import { join, isAbsolute } from "path";
import { homedir } from "os";
var MDOCS_DIR = ".mdocs";
var REPOS_DIR = join(MDOCS_DIR, "repos");
function mdocsExists(cwd) {
  return existsSync(join(cwd, MDOCS_DIR));
}
function reposDirExists(cwd) {
  return existsSync(join(cwd, REPOS_DIR));
}
function createMdocsStructure(cwd) {
  mkdirSync(join(cwd, REPOS_DIR), { recursive: true });
}
function resolveDataDir(dataDir) {
  if (!dataDir) return homedir();
  return isAbsolute(dataDir) ? dataDir : join(process.cwd(), dataDir);
}

// src/commands/setup.ts
import chalk from "chalk";
async function runSetup(cwd) {
  const dir = resolveDataDir(cwd);
  console.log(chalk.dim("\n  Setting up mDocs project structure...\n"));
  createMdocsStructure(dir);
  console.log(chalk.green("  \u2713") + chalk.white(`  ${MDOCS_DIR}/`));
  console.log(chalk.green("  \u2713") + chalk.white(`  ${REPOS_DIR}/`));
  console.log(chalk.bold.green("\n  mDocs initialized successfully!\n"));
}

// src/lib/banner.ts
import gradient from "gradient-string";
import figlet from "figlet";
var GRADIENT = ["#06b6d4", "#8b5cf6", "#ec4899"];
function printBanner() {
  const text = figlet.textSync("mDocs", { font: "ANSI Shadow" });
  console.log(gradient(GRADIENT).multiline(text));
  console.log();
}

// src/commands/serve.ts
var VIEWER_URL = "https://idocs-md-viewer.vercel.app/";
async function serve(options) {
  const cwd = resolveDataDir(options.dataDir);
  const port = parseInt(options.port, 10);
  const host = options.host;
  if (!mdocsExists(cwd) || !reposDirExists(cwd)) {
    await runSetup(cwd);
  }
  console.log(chalk2.dim(`
  Starting server on ${host}:${port}...
`));
  const origins = options.origin ? [options.origin, ...DEFAULT_ORIGINS] : DEFAULT_ORIGINS;
  const server = await startServer({ port, host, dataDir: cwd, origins, githubToken: options.githubToken });
  printBanner();
  console.log(
    chalk2.bold("  Server running at ") + chalk2.bold.underline.cyan(`http://${host}:${port}`)
  );
  console.log(chalk2.dim(`  Health: http://${host}:${port}/health`));
  if (options.origin) {
    console.log(chalk2.dim(`  CORS origin: ${options.origin}`));
  }
  console.log(chalk2.dim(`  Opening ${VIEWER_URL}`));
  console.log(chalk2.dim("\n  Press Ctrl+C to stop.\n"));
  void open(VIEWER_URL);
  process.on("SIGINT", () => {
    console.log(chalk2.dim("\n  Stopping mDocs server\u2026\n"));
    server.close(() => process.exit(0));
  });
}

// src/index.ts
var program = new Command();
program.name("mdocs").description("mDocs \u2014 local documentation server").version("0.1.0");
program.command("serve").description("Start the mDocs local server").option("-p, --port <port>", "Port to listen on", "4873").option("-H, --host <host>", "Host to bind to", "127.0.0.1").option("-d, --data-dir <dir>", "Directory that holds (or will hold) .mdocs/").option("-o, --origin <origin>", "Allowed CORS origin").option("-t, --github-token <token>", "GitHub PAT for cloning private repositories (or set GITHUB_TOKEN env var)").action(serve);
program.command("setup").description("Initialize .mdocs/ project structure in the current directory").option("-d, --data-dir <dir>", "Target directory (defaults to cwd)").action((opts) => runSetup(opts.dataDir));
program.parse();
