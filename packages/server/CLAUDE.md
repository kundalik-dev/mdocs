# @mdocs/server — Claude Reference

Local HTTP server that clones public/private GitHub repositories and serves their markdown files over a REST API. Used internally by `mdocs` and can be embedded in any Node.js app.

## Key files

```
src/
  index.ts       — public exports + startServer() entry point
  app.ts         — Express app factory (createApp)
  config.ts      — parseConfig(), defaults, reposDir() helper
  types.ts        — Config, RepoMeta, FileRef, FileContent interfaces
  routes/
    repos.ts     — /api/repos/* (clone, sync, delete, list)
    files.ts     — /api/repos/:repoId/files/* (list + read)
    health.ts    — GET /health
  services/
    git.ts       — cloneRepo, pullRepo, getHeadCommit, getDefaultBranch
    scanner.ts   — scanMarkdownFiles (recursive walk, skips node_modules etc.)
    repo-store.ts — read/write/delete repo metadata as JSON files in reposDir
  security/
    cors.ts      — origin allowlist middleware
    github-url.ts — validateGitHubUrl (HTTPS github.com only)
    paths.ts     — safeResolve (path traversal guard)
```

## Config

All config flows through `parseConfig(overrides?)` → `Config`.

| Field | Env var | Default |
|---|---|---|
| `port` | `PORT` | `4873` |
| `host` | `HOST` | `127.0.0.1` |
| `dataDir` | `DATA_DIR` | `os.homedir()` |
| `origins` | — | localhost:3000, 127.0.0.1:3000, idocs-md-viewer.vercel.app |
| `githubToken` | `GITHUB_TOKEN` | undefined |

## Data layout on disk

All state lives under `<dataDir>/.mdocs/repos/`:
- `<uuid>.json` — RepoMeta for each tracked repo
- `<uuid>/` — the git clone directory

`reposDir(dataDir)` in `config.ts` computes the full path.

## REST API

```
GET    /health
GET    /api/repos
POST   /api/repos/clone          body: { url, branch? }
POST   /api/repos/:id/sync
DELETE /api/repos/:id
GET    /api/repos/:id/files
GET    /api/repos/:id/files/:path
```

## Important decisions

- **`dataDir` defaults to `homedir()`** — repos are stored in `~/.mdocs/repos/` globally, not per-project cwd.
- **GitHub-only URLs** — `validateGitHubUrl` rejects anything that isn't `https://github.com/owner/repo`. Enforced in `repos.ts` before any git call.
- **Private repo support** — when `githubToken` is set, `injectToken()` in `git.ts` rewrites the clone URL to `https://oauth2:<token>@github.com/...`. Token is never stored in RepoMeta or returned by the API.
- **`mkdirSync(reposDir, { recursive: true })`** is called inside the clone handler before git runs — ensures the parent directory always exists regardless of how dataDir was set.
- **Path traversal** — `safeResolve(base, ...parts)` in `security/paths.ts` returns `null` if the resolved path escapes `base`. Used in `files.ts` for every file read. Repo IDs are also checked for `/`, `\`, `..` in `repo-store.ts`.
- **Scanner limits** — skips `.git`, `node_modules`, `dist`, `build`, `.next`, `.turbo`, `vendor`, `.cache`. Max file size 1 MB. Extensions: `.md`, `.markdown`, `.mdx`.
- **Explicit return type on `createApp`** — must be `Express` (not inferred) to avoid `error TS2742` during `dts` build due to `@types/express-serve-static-core` not being portable.

## Programmatic usage

```ts
import { startServer, createApp, parseConfig } from '@mdocs/server';

// Simple
const server = await startServer({ port: 4873, githubToken: process.env.GITHUB_TOKEN });

// Custom (testing)
const config = parseConfig({ port: 0 });
const app = createApp(config);
```

## Build

```sh
pnpm build        # tsup — outputs dist/index.js + dist/index.d.ts
pnpm typecheck    # tsc --noEmit
```

`tsup.config.ts`: ESM only, target node18, `dts: true`, `clean: true`, `shims: true`.
