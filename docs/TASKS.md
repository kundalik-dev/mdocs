# mDocs Implementation Tasks

Track progress here. Check the box when a task is complete.

---

## Phase 1 — Infra

- [x] **#1** Set up monorepo structure with pnpm workspaces
  - `pnpm-workspace.yaml`, root `package.json`
  - Scaffold `packages/server`, `packages/cli`

---

## Phase 2 — Local Server (`packages/server`)

- [x] **#3** Scaffold `packages/server` HTTP server entry point
  - `index.ts`, `app.ts`, `config.ts`
  - Bind to `127.0.0.1:5540`

- [x] **#4** Implement `/health` endpoint
  - Returns `{ ok: true, name: "modcs-server", version: "0.1.0" }`

- [x] **#5** Implement CORS and security middleware
  - Origin allowlist (Vercel prod + localhost:3000)
  - `security/cors.ts`, `security/paths.ts`, `security/github-url.ts`
  - GitHub HTTPS URL validation; path traversal guard on all file reads

- [x] **#6** Implement JSON-based repo metadata store
  - `services/repo-store.ts` reads/writes `.mdocs/repos/<uuid>.json` (one file per repo)
  - Full `RepoMeta` stored: id, name, url, branch, clonedAt, lastSyncedAt, currentCommit, fileCount

- [x] **#7** Implement Git service (clone, fetch, pull)
  - `services/git.ts`
  - Strict argument arrays, no shell string composition
  - `cloneRepo`, `pullRepo`, `getHeadCommit`, `getDefaultBranch`

- [x] **#8** Implement markdown scanner service
  - `services/scanner.ts` — recursive walk, skips `.git`/`node_modules`/`.next`/`dist`/`build`/`.turbo`
  - File read handled inline in `routes/files.ts` with path traversal check and 1 MB size limit

- [x] **#9** Implement `POST /api/repos/clone`
  - Validates GitHub HTTPS URL
  - Clones into `.mdocs/repos/<uuid>/`, scans markdown files, persists metadata, returns `RepoMeta`

- [x] **#10** Implement `GET /api/repos`, `POST /api/repos/:repoId/sync`, `DELETE /api/repos/:repoId`
  - List all repos from per-repo JSON files
  - Sync: `git pull --ff-only`, rescan files, update metadata JSON
  - Delete: removes clone folder and metadata JSON

- [x] **#11** Implement `GET /api/repos/:repoId/files` and `/files/:path`
  - File list: id, name, relPath, size, lastModified
  - File read: content + metadata, path traversal guard, 1 MB size limit

---

## Phase 3 — CLI (`packages/cli`)

- [x] **#12** Scaffold `packages/cli` with `npx @iprep/mdocks start` command
  - `src/index.ts` entry point
  - `commands/start.ts` with `--port`, `--host`, `--data-dir`, `--origin` flags
  - `commands/setup.ts` — initialize `.mdocs/repos/` structure
  - Gradient `mDocs` banner on server start (figlet + gradient-string)
  - Detects missing `.mdocs/` and prompts to initialize via inquirer

---

## Phase 4 — Frontend Integration

- [x] **#13** Add local server API client (`src/lib/local-server-client.ts`)
  - Typed fetch wrappers: `checkHealth`, `listRepos`, `cloneRepo`, `syncRepo`, `listFiles`, `readFile`
  - Handle offline/error states

- [x] **#14** Extend viewer store and IDB with `local-server` source type
  - Update `viewer-store.ts` for ViewerSource union
  - Persist local-server source metadata in IndexedDB
  - Keep all existing browser-fs behavior intact

- [x] **#15** Build local server connection panel UI
  - Poll `/health` on mount
  - Show connected / disconnected / error states
  - Allow changing URL and port
  - Persist last successful URL in IndexedDB

- [x] **#16** Add GitHub URL clone flow to frontend
  - GitHub URL input (shown when server is connected)
  - Client-side URL validation
  - Loading state during clone
  - Clear error messages

- [x] **#17** Show cloned repos in sidebar with unified file tree
  - Render local-server sources alongside browser-fs sources
  - Group files by `dirSegments` for tree structure
  - Show repo name and branch as source header

- [x] **#18** Implement local-server file loading in the viewer
  - Branch `use-file-content.ts` on `sourceType`
  - Call `localServerClient.readFile()` for server files
  - Pipe through existing markdown pipeline
  - Handle loading, offline, and file-missing states

---

## Phase 5 — Sync

- [ ] **#19** Add manual sync button per cloned repo
  - Sync button per local-server source in sidebar
  - Status labels: Syncing / Synced / Failed / Update available / Server offline
  - Refresh file tree after sync
  - Reload active file or show missing-file state

---

## Phase 6 — Hardening

- [ ] **#20** Add repo deletion, auto sync, and limits
  - `DELETE /api/repos/:repoId` endpoint
  - Remove-repo UI in frontend
  - Clone size limits and scan depth limits on server
  - Auto sync with configurable interval
  - Origin allowlist config option in CLI

---

## Notes

- Browser File API mode must remain fully working throughout all phases.
- Never upload document content to Vercel.
- Local server binds to `127.0.0.1` only — never `0.0.0.0`.
- Use strict git argument arrays — no shell string composition.
- Test with Chrome/Edge/Brave (File System Access API required).
