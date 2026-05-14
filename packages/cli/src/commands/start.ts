import chalk from "chalk";
import open from "open";
import {
  DEFAULT_ORIGINS,
  DEFAULT_PORT,
  startServer,
} from "@iprep/modcs-server";
import { mdocsExists, reposDirExists, resolveDataDir } from "../lib/mdocs.js";
import { runSetup } from "./setup.js";
import { printBanner } from "../lib/banner.js";

const VIEWER_URL = "https://mdocs-md-viewer.vercel.app/";

export interface StartOptions {
  port: string;
  host: string;
  dataDir?: string;
  origin?: string;
  githubToken?: string;
}

export async function start(options: StartOptions): Promise<void> {
  const cwd = resolveDataDir(options.dataDir);
  const port = parseInt(options.port, 10);
  const host = options.host;

  if (Number.isNaN(port)) {
    throw new Error(`Invalid port: ${options.port}`);
  }

  if (!mdocsExists(cwd) || !reposDirExists(cwd)) {
    await runSetup(cwd);
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
    if (error instanceof Error && error.message.includes("EADDRINUSE")) {
      console.error(
        chalk.red(
          `Failed to start mDocs server: port ${port} is already in use.`,
        ),
      );
      console.error(
        chalk.dim(
          `Use a different port with --port <port> or stop the process already using ${host}:${port}.`,
        ),
      );
    } else {
      console.error(
        chalk.red("Failed to start mDocs server:"),
        error instanceof Error ? error.message : error,
      );
    }
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
    console.log(chalk.dim("\n  Stopping mDocs server...\n"));
    server.close(() => process.exit(0));
  });
}

export const DEFAULT_START_PORT = String(DEFAULT_PORT);
