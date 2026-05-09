// src/index.ts
import { fileURLToPath } from "url";
import { resolve as resolve3 } from "path";

// src/app.ts
import express from "express";

// src/security/cors.ts
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

// src/routes/health.ts
import { Router } from "express";
function healthRouter() {
  const router = Router();
  router.get("/", (_req, res) => {
    res.json({ ok: true, name: "mdocs-server", version: "0.1.0" });
  });
  return router;
}

// src/routes/repos.ts
import { Router as Router3 } from "express";
import { randomUUID } from "crypto";
import { join as join4 } from "path";
import { mkdirSync } from "fs";

// src/config.ts
import { resolve } from "path";
import { homedir } from "os";
var DEFAULT_PORT = 4873;
var DEFAULT_HOST = "127.0.0.1";
var MDOCS_DIR = ".mdocs";
var REPOS_SUBDIR = "repos";
var DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://idocs-md-viewer.vercel.app"
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

// src/security/github-url.ts
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

// src/services/git.ts
import { spawn } from "child_process";
function run(args, cwd) {
  return new Promise((resolve4, reject) => {
    const proc = spawn("git", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => stdout += chunk.toString());
    proc.stderr.on("data", (chunk) => stderr += chunk.toString());
    proc.on("close", (code) => {
      if (code === 0) resolve4(stdout.trim());
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

// src/services/scanner.ts
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

// src/services/repo-store.ts
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

// src/routes/files.ts
import { Router as Router2 } from "express";
import { readFileSync as readFileSync2, statSync as statSync2, existsSync as existsSync2 } from "fs";
import { join as join3 } from "path";

// src/security/paths.ts
import { resolve as resolve2 } from "path";
function safeResolve(base, ...parts) {
  const resolved = resolve2(base, ...parts);
  return resolved.startsWith(base) ? resolved : null;
}

// src/routes/files.ts
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

// src/routes/repos.ts
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

// src/app.ts
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

// src/index.ts
async function startServer(overrides = {}) {
  const config = parseConfig(overrides);
  const app = createApp(config);
  return new Promise((resolve_, reject) => {
    const server = app.listen(config.port, config.host, () => resolve_(server));
    server.on("error", reject);
  });
}
var __filename2 = fileURLToPath(import.meta.url);
var isMain = process.argv[1] !== void 0 && resolve3(process.argv[1]) === resolve3(__filename2);
if (isMain) {
  const config = parseConfig();
  startServer(config).then(() => {
    console.log(`mDocs server listening at http://${config.host}:${config.port}`);
  }).catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
}
export {
  DEFAULT_HOST,
  DEFAULT_ORIGINS,
  DEFAULT_PORT,
  createApp,
  parseConfig,
  reposDir,
  startServer
};
