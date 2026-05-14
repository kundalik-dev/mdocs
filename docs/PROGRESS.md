---
title: mDocs Build Progress
description: Live tracker for the mDocs monorepo — CLI and server packages.
author: Claude (with kundalik)
date: 2026-05-09
tags: [progress, tracker, monorepo]
---

# mDocs Build Progress

Current state of the two active packages: `packages/cli` and `packages/server`.

---

## packages/cli

### Done

- [x] Monorepo scaffold — `pnpm-workspace.yaml`, root `package.json`
- [x] CLI package with `tsup` build, `tsx` dev workflow
- [x] `modcs start` command — `--port`, `--host`, `--data-dir`, `--origin` flags
- [x] `modcs setup` command — creates `.mdocs/repos/` in target directory
- [x] Auto-detects missing `.mdocs/` on `start` and prompts to initialize (inquirer)
- [x] Gradient `mDocs` ASCII banner on server start (figlet ANSI Shadow + gradient-string)
- [x] SIGINT handler — clean shutdown message on Ctrl+C
- [x] Integrated with `@iprep/modcs-server` — calls `startServer()` directly

### Stack

- `commander` — CLI argument parsing
- `chalk` — terminal colours
- `inquirer` — interactive prompts
- `figlet` + `gradient-string` — gradient ASCII banner

---

## packages/server

### Done

- [x] Express 4 HTTP server bound to `127.0.0.1:5540` by default
- [x] `GET /health` — health check endpoint
- [x] `GET /api/repos` — list all cloned repositories
- [x] `POST /api/repos/clone` — clone a public GitHub repo into `.mdocs/repos/<uuid>/`
- [x] `POST /api/repos/:id/sync` — `git pull --ff-only`, rescan files, update metadata
- [x] `DELETE /api/repos/:id` — remove clone folder and JSON metadata
- [x] `GET /api/repos/:id/files` — list all markdown files in a repo
- [x] `GET /api/repos/:id/files/:path` — read a single markdown file with metadata
- [x] File-based storage — no database; each repo writes `<uuid>.json` alongside the clone
- [x] CORS middleware — origin allowlist (localhost:3000, 127.0.0.1:3000, mdocs.vercel.app)
- [x] GitHub URL validation — HTTPS only, github.com only
- [x] Path traversal guard on all file reads
- [x] Recursive markdown scanner — skips `node_modules`, `.next`, `dist`, `build`, `.git`
- [x] Standalone mode — `pnpm dev:server` starts the server directly
- [x] Exported `startServer(config)` function — consumed by the CLI

### Stack

- `express` — HTTP server
- `cors` — CORS middleware
- Node built-ins: `child_process` (git), `fs`, `crypto` (UUID)

---

## Next up

- [ ] Frontend integration — connect the existing web viewer to `http://127.0.0.1:5540`
- [ ] `GET /health` polling in the frontend to detect server presence
- [ ] Clone UI — GitHub URL input shown when server is connected
- [ ] Show cloned repos in the sidebar alongside browser-fs sources
- [ ] Load file content from server via `GET /api/repos/:id/files/:path`
- [ ] Manual sync button per repo

---

## Dev commands

```bash
# Start server standalone (no banner, plain log)
pnpm dev:server

# Build server, then start CLI with full banner
pnpm serve

# Build everything
pnpm build
```

See `docs/API.md` for the full endpoint reference and curl examples.
