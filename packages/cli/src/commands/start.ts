import chalk from "chalk";
import open from "open";
import {
  DEFAULT_ORIGINS,
  DEFAULT_PORT,
  startServer,
} from "@iprep/modcs-server";
import { mdocsExists, reposDirExists, resolveDataDir } from "../lib/mdocs.js";
import { findAvailablePort } from "../lib/port.js";
import { runSetup } from "./setup.js";
import { printBanner } from "../lib/banner.js";

const VIEWER_URL = "https://www.mdocks.dev/";

export interface StartOptions {
  port: string;
  host: string;
  dataDir?: string;
  origin?: string;
  githubToken?: string;
}

export async function start(options: StartOptions): Promise<void> {
  const cwd = resolveDataDir(options.dataDir);
  const requestedPort = parseInt(options.port, 10);
  const host = options.host;

  if (Number.isNaN(requestedPort)) {
    throw new Error(`Invalid port: ${options.port}`);
  }

  if (!mdocsExists(cwd) || !reposDirExists(cwd)) {
    await runSetup(cwd);
  }

  // Pre-flight: find a free port, auto-incrementing from the requested one
  const port = await findAvailablePort(requestedPort, host);
  if (port === null) {
    console.error(
      chalk.red(
        `\n  Could not find a free port (tried ${requestedPort}–${requestedPort + 19}).`,
      ),
    );
    console.error(
      chalk.dim(
        `  Use ${chalk.bold("--port <port>")} to specify a different starting port, or stop existing processes.\n`,
      ),
    );
    process.exit(1);
  }

  if (port !== requestedPort) {
    console.log(
      chalk.yellow(
        `\n  Port ${requestedPort} is in use — using port ${port} instead.`,
      ),
    );
  }

  console.log(chalk.dim(`\n  Starting server on ${host}:${port}...\n`));

  const origins = options.origin
    ? [options.origin, ...DEFAULT_ORIGINS]
    : DEFAULT_ORIGINS;

  let server;

  try {
    server = await startServer({
      port,
      host,
      dataDir: cwd,
      origins,
      githubToken: options.githubToken,
    });
  } catch (error: unknown) {
    console.error(
      chalk.red("Failed to start mDocks server:"),
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  printBanner();

  console.log(
    chalk.bold("  Server running at ") +
      chalk.bold.underline.cyan(`http://${host}:${port}`),
  );
  console.log(chalk.dim(`  Health: http://${host}:${port}/health`));
  if (options.origin) {
    console.log(chalk.dim(`  CORS origin: ${options.origin}`));
  }
  console.log(chalk.dim(`  Opening ${VIEWER_URL}`));
  console.log(chalk.dim("\n  Press Ctrl+C to stop.\n"));

  void open(VIEWER_URL);

  process.on("SIGINT", () => {
    console.log(chalk.dim("\n  Stopping mDocks server...\n"));
    server.close(() => process.exit(0));
  });
}

export const DEFAULT_START_PORT = String(DEFAULT_PORT);
