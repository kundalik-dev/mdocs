#!/usr/bin/env node

// src/index.ts
import { readFileSync as readFileSync3 } from "fs";
import { Command } from "commander";

// src/commands/start.ts
import chalk2 from "chalk";
import open from "open";

// ../server/src/app.ts
import express from "express";

// ../server/src/security/cors.ts
import cors from "cors";
function createCorsMiddleware(config) {
  return cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.origins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} is not allowed`));
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
  });
}

// ../server/src/routes/health.ts
import { Router } from "express";
function healthRouter() {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json({ ok: true, name: "modcs-server", version: "0.1.0" });
  });
  return router;
}

// ../server/src/routes/repos.ts
import { Router as Router3 } from "express";
import { randomUUID } from "crypto";
import { join as join4 } from "path";
import { mkdirSync } from "fs";

// ../server/src/config.ts
import { resolve } from "path";
import { homedir } from "os";
var DEFAULT_PORT = 5540;
var DEFAULT_HOST = "127.0.0.1";
var MDOCS_DIR = ".mdocs";
var REPOS_SUBDIR = "repos";
var DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://mdocs-reader.vercel.app"
];
function parseConfig(overrides = {}) {
  return {
    port: overrides.port ?? parseInt(process.env["PORT"] ?? String(DEFAULT_PORT), 10),
    host: overrides.host ?? process.env["HOST"] ?? DEFAULT_HOST,
    dataDir: overrides.dataDir ?? process.env["DATA_DIR"] ?? homedir(),
    origins: overrides.origins ?? DEFAULT_ORIGINS,
    githubToken: overrides.githubToken ?? process.env["GITHUB_TOKEN"]
  };
}
function reposDir(dataDir) {
  return resolve(dataDir, MDOCS_DIR, REPOS_SUBDIR);
}

// ../server/src/security/github-url.ts
function validateGitHubUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== "github.com") return null;
    const parts = parsed.pathname.replace(/^\//, "").replace(/\.git$/, "").split("/");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}

// ../server/src/services/git.ts
import { spawn } from "child_process";
function run(args, cwd) {
  return new Promise((resolve3, reject) => {
    const proc = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => stdout += chunk.toString());
    proc.stderr.on("data", (chunk) => stderr += chunk.toString());
    proc.on("close", (code) => {
      if (code === 0) resolve3(stdout.trim());
      else reject(new Error(stderr.trim() || `git exited with code ${code}`));
    });
    proc.on("error", (err) => {
      if (err.code === "ENOENT") {
        reject(new Error("git not found \u2014 make sure Git is installed and available in PATH"));
      } else {
        reject(err);
      }
    });
  });
}
async function cloneRepo(url, dest, branch, token) {
  const cloneUrl = token ? injectToken(url, token) : url;
  const args = ["clone", cloneUrl, dest, "--single-branch"];
  if (branch) args.push("--branch", branch);
  await run(args);
}
function injectToken(url, token) {
  const parsed = new URL(url);
  parsed.username = "oauth2";
  parsed.password = token;
  return parsed.toString();
}
async function pullRepo(repoPath) {
  await run(["pull", "--ff-only"], repoPath);
}
async function getHeadCommit(repoPath) {
  return run(["rev-parse", "HEAD"], repoPath);
}
async function getDefaultBranch(repoPath) {
  try {
    return await run(["symbolic-ref", "--short", "HEAD"], repoPath);
  } catch {
    return "main";
  }
}

// ../server/src/services/scanner.ts
import { readdirSync, statSync } from "fs";
import { join, relative, basename, extname } from "path";
var SKIP_DIRS = /* @__PURE__ */ new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".turbo",
  "vendor",
  ".cache"
]);
var MD_EXTS = /* @__PURE__ */ new Set([".md", ".markdown", ".mdx"]);
var MAX_FILE_SIZE = 1024 * 1024;
function scanMarkdownFiles(repoPath, repoId) {
  const results = [];
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }
      if (stat.isDirectory()) {
        walk(fullPath);
        continue;
      }
      if (!stat.isFile()) continue;
      if (!MD_EXTS.has(extname(entry).toLowerCase())) continue;
      if (stat.size > MAX_FILE_SIZE) continue;
      const relPath = relative(repoPath, fullPath).replace(/\\/g, "/");
      results.push({
        id: relPath,
        repoId,
        name: basename(entry),
        relPath,
        size: stat.size,
        lastModified: stat.mtimeMs
      });
    }
  }
  walk(repoPath);
  return results;
}

// ../server/src/services/repo-store.ts
import { readFileSync, writeFileSync, existsSync, readdirSync as readdirSync2, unlinkSync, rmSync } from "fs";
import { join as join2 } from "path";
function listRepos(reposDir2) {
  if (!existsSync(reposDir2)) return [];
  return readdirSync2(reposDir2).filter((f) => f.endsWith(".json")).flatMap((f) => {
    try {
      return [JSON.parse(readFileSync(join2(reposDir2, f), "utf8"))];
    } catch {
      return [];
    }
  });
}
function getRepo(reposDir2, id) {
  if (id.includes("/") || id.includes("\\") || id.includes("..")) return null;
  const file = join2(reposDir2, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
function saveRepo(reposDir2, meta) {
  writeFileSync(join2(reposDir2, `${meta.id}.json`), JSON.stringify(meta, null, 2), "utf8");
}
function deleteRepo(reposDir2, id) {
  if (id.includes("/") || id.includes("\\") || id.includes("..")) return;
  const metaFile = join2(reposDir2, `${id}.json`);
  const cloneDir = join2(reposDir2, id);
  if (existsSync(metaFile)) unlinkSync(metaFile);
  if (existsSync(cloneDir)) rmSync(cloneDir, { recursive: true, force: true });
}

// ../server/src/routes/files.ts
import { Router as Router2 } from "express";
import { readFileSync as readFileSync2, statSync as statSync2, existsSync as existsSync2 } from "fs";
import { join as join3 } from "path";

// ../server/src/security/paths.ts
import { resolve as resolve2 } from "path";
function safeResolve(base, ...parts) {
  const resolved = resolve2(base, ...parts);
  return resolved.startsWith(base) ? resolved : null;
}

// ../server/src/routes/files.ts
function filesRouter(config) {
  const router = Router2({ mergeParams: true });
  const reposDir2 = reposDir(config.dataDir);
  router.get("*", (req, res) => {
    const { repoId } = req.params;
    if (!getRepo(reposDir2, repoId)) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }
    const cloneDir = join3(reposDir2, repoId);
    const relPath = req.path === "/" ? "" : decodeURIComponent(req.path.slice(1));
    if (!relPath) {
      res.json(scanMarkdownFiles(cloneDir, repoId));
      return;
    }
    const absPath = safeResolve(cloneDir, relPath);
    if (!absPath) {
      res.status(400).json({ error: "Invalid file path" });
      return;
    }
    if (!existsSync2(absPath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    try {
      const stat = statSync2(absPath);
      const content = readFileSync2(absPath, "utf8");
      const file = {
        id: relPath,
        repoId,
        name: relPath.split("/").pop() ?? relPath,
        relPath,
        size: stat.size,
        lastModified: stat.mtimeMs,
        content
      };
      res.json(file);
    } catch {
      res.status(500).json({ error: "Failed to read file" });
    }
  });
  return router;
}

// ../server/src/routes/repos.ts
function reposRouter(config) {
  const router = Router3();
  const reposDir2 = reposDir(config.dataDir);
  router.use("/:repoId/files", filesRouter(config));
  router.get("/", (_req, res) => {
    res.json(listRepos(reposDir2));
  });
  router.post("/clone", async (req, res) => {
    const { url, branch } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: '"url" is required' });
      return;
    }
    const parsed = validateGitHubUrl(url);
    if (!parsed) {
      res.status(400).json({ error: "Only public GitHub HTTPS URLs are supported (https://github.com/owner/repo)" });
      return;
    }
    const id = randomUUID();
    const cloneDir = join4(reposDir2, id);
    try {
      mkdirSync(reposDir2, { recursive: true });
      await cloneRepo(url, cloneDir, branch, config.githubToken);
      const detectedBranch = branch ?? await getDefaultBranch(cloneDir);
      const currentCommit = await getHeadCommit(cloneDir);
      const files = scanMarkdownFiles(cloneDir, id);
      const meta = {
        id,
        name: `${parsed.owner}/${parsed.repo}`,
        url,
        branch: detectedBranch,
        clonedAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastSyncedAt: null,
        currentCommit,
        fileCount: files.length
      };
      saveRepo(reposDir2, meta);
      res.status(201).json(meta);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  router.post("/:repoId/sync", async (req, res) => {
    const { repoId } = req.params;
    const meta = getRepo(reposDir2, repoId);
    if (!meta) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }
    const cloneDir = join4(reposDir2, repoId);
    try {
      await pullRepo(cloneDir);
      const currentCommit = await getHeadCommit(cloneDir);
      const files = scanMarkdownFiles(cloneDir, repoId);
      const updated = {
        ...meta,
        currentCommit,
        fileCount: files.length,
        lastSyncedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      saveRepo(reposDir2, updated);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  router.delete("/:repoId", (req, res) => {
    const { repoId } = req.params;
    if (!getRepo(reposDir2, repoId)) {
      res.status(404).json({ error: "Repository not found" });
      return;
    }
    deleteRepo(reposDir2, repoId);
    res.status(204).send();
  });
  return router;
}

// ../server/src/app.ts
function createApp(config) {
  const app = express();
  app.use(createCorsMiddleware(config));
  app.use(express.json());
  app.use("/health", healthRouter());
  app.use("/api/repos", reposRouter(config));
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  return app;
}

// ../server/src/index.ts
async function startServer(overrides = {}) {
  const config = parseConfig(overrides);
  const app = createApp(config);
  return new Promise((resolve_, reject) => {
    const server = app.listen(config.port, config.host, () => resolve_(server));
    server.on("error", reject);
  });
}

// src/lib/mdocs.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2 } from "fs";
import { join as join5, isAbsolute } from "path";
import { homedir as homedir2 } from "os";
var MDOCS_DIR2 = ".mdocs";
var REPOS_DIR = join5(MDOCS_DIR2, "repos");
function mdocsExists(cwd) {
  return existsSync3(join5(cwd, MDOCS_DIR2));
}
function reposDirExists(cwd) {
  return existsSync3(join5(cwd, REPOS_DIR));
}
function createMdocsStructure(cwd) {
  mkdirSync2(join5(cwd, REPOS_DIR), { recursive: true });
}
function resolveDataDir(dataDir) {
  if (!dataDir) return homedir2();
  return isAbsolute(dataDir) ? dataDir : join5(process.cwd(), dataDir);
}

// src/lib/port.ts
import { createServer } from "net";
var MAX_PORT_ATTEMPTS = 10;
function isPortAvailable(port, host) {
  return new Promise((resolve3) => {
    const tester = createServer();
    tester.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve3(false);
      } else {
        resolve3(false);
      }
    });
    tester.once("listening", () => {
      tester.close(() => resolve3(true));
    });
    tester.listen(port, host);
  });
}
async function findAvailablePort(startPort, host) {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  return null;
}

// src/commands/setup.ts
import chalk from "chalk";
async function runSetup(cwd) {
  const dir = resolveDataDir(cwd);
  console.log(chalk.dim("\n  Setting up mDocs project structure...\n"));
  createMdocsStructure(dir);
  console.log(chalk.green("  \u2713") + chalk.white(`  ${MDOCS_DIR2}/`));
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

// src/commands/start.ts
var VIEWER_URL = "https://mdocs-reader.vercel.app/";
async function start(options) {
  const cwd = resolveDataDir(options.dataDir);
  const requestedPort = parseInt(options.port, 10);
  const host = options.host;
  if (Number.isNaN(requestedPort)) {
    throw new Error(`Invalid port: ${options.port}`);
  }
  if (!mdocsExists(cwd) || !reposDirExists(cwd)) {
    await runSetup(cwd);
  }
  const port = await findAvailablePort(requestedPort, host);
  if (port === null) {
    console.error(
      chalk2.red(
        `
  Could not find a free port (tried ${requestedPort}\u2013${requestedPort + 19}).`
      )
    );
    console.error(
      chalk2.dim(
        `  Use ${chalk2.bold("--port <port>")} to specify a different starting port, or stop existing processes.
`
      )
    );
    process.exit(1);
  }
  if (port !== requestedPort) {
    console.log(
      chalk2.yellow(
        `
  Port ${requestedPort} is in use \u2014 using port ${port} instead.`
      )
    );
  }
  console.log(chalk2.dim(`
  Starting server on ${host}:${port}...
`));
  const origins = options.origin ? [options.origin, ...DEFAULT_ORIGINS] : DEFAULT_ORIGINS;
  let server;
  try {
    server = await startServer({
      port,
      host,
      dataDir: cwd,
      origins,
      githubToken: options.githubToken
    });
  } catch (error) {
    console.error(
      chalk2.red("Failed to start mDocs server:"),
      error instanceof Error ? error.message : error
    );
    process.exit(1);
  }
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
    console.log(chalk2.dim("\n  Stopping mDocs server...\n"));
    server.close(() => process.exit(0));
  });
}
var DEFAULT_START_PORT = String(DEFAULT_PORT);

// src/index.ts
var program = new Command();
var packageJson = JSON.parse(
  readFileSync3(new URL("../package.json", import.meta.url), "utf8")
);
program.name("modcs").description("mDocs \u2014 local documentation server").version(packageJson.version);
program.command("start").description("Start the mDocs local server").option("-p, --port <port>", "Port to listen on", DEFAULT_START_PORT).option("-H, --host <host>", "Host to bind to", "127.0.0.1").option("-d, --data-dir <dir>", "Directory that holds (or will hold) .mdocs/").option("-o, --origin <origin>", "Allowed CORS origin").option("-t, --github-token <token>", "GitHub PAT for cloning private repositories (or set GITHUB_TOKEN env var)").action(start);
program.command("setup").description("Initialize .mdocs/ project structure in the current directory").option("-d, --data-dir <dir>", "Target directory (defaults to cwd)").action((opts) => runSetup(opts.dataDir));
program.parse();
