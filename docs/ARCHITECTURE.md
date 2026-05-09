# mDocs Hybrid Architecture

mDocs should support two document sources side by side:

1. Browser File API mode, which already exists and reads local files through the File System Access API.
2. Local backend mode, where the user runs `npx mdocs server` and the deployed Vercel frontend talks to `http://127.0.0.1:<port>`.

The goal is to keep the current private, browser-only workflow working while adding a stronger local server workflow for Git clone, Git pull, repo indexing, and markdown APIs.

## High Level Shape

```text
Vercel frontend
  https://mdocs.vercel.app
  - Viewer UI
  - Source picker
  - Markdown renderer
  - File tree
  - Talks to browser file handles or localhost API

Browser File API source
  - User picks folders/files manually
  - Browser grants read access
  - Existing IndexedDB persistence remains

Local mDocs server
  http://127.0.0.1:4873
  - Started by `npx mdocs server`
  - Owns filesystem and git operations
  - Stores cloned repos under `.mdocs`
  - Exposes HTTP APIs consumed by the frontend
```

## Monorepo Structure

The project is organized as a pnpm monorepo with two packages: `packages/cli` and `packages/server`.

```text
mdocs/
  package.json
  pnpm-workspace.yaml
  docs/

  packages/
    cli/
      package.json
      tsconfig.json
      tsup.config.ts
      src/
        index.ts
        commands/
          serve.ts
          setup.ts
        lib/
          banner.ts
          mdocs.ts
        types.ts

    server/
      package.json
      src/
        index.ts
        app.ts
        config.ts
        routes/
          health.ts
          repos.ts
          files.ts
        services/
          git.ts
          repo-store.ts
          scanner.ts
          file-reader.ts
        security/
          cors.ts
          paths.ts
          github-url.ts
```

Ownership:

- `packages/server` owns localhost HTTP APIs, git operations, repo scans, and `.mdocs` storage.
- `packages/cli` owns the `npx mdocs serve` command, `.mdocs` initialization, and delegates server startup to `packages/server`.

The current repository can migrate toward this structure gradually. Until then, `src/` can remain the frontend app and new `server/` or `packages/` folders can be introduced incrementally.
## Source Modes

The viewer should treat every document source through a shared interface, but the backing implementation can differ.

```ts
type ViewerSource =
  | {
      type: "browser-fs";
      id: string;
      label: string;
      files: BrowserFileRef[];
    }
  | {
      type: "local-server";
      id: string;
      label: string;
      serverUrl: string;
      repoId: string;
      files: ServerFileRef[];
    };
```

Browser File API mode should continue using the existing `src/lib/fs.ts`, `src/lib/idb.ts`, and `src/store/viewer-store.ts` behavior.

Local backend mode should add a second data path that fetches file lists and file content from the local server instead of reading `FileSystemFileHandle` objects.

## Local Server Responsibilities

The local server is the only part that should touch git or write cloned repositories to disk.

Default storage layout inside the working directory:

```text
.mdocs/
  repos/
    <uuid>/          ← git clone of a repository
    <uuid>.json      ← repo metadata (id, name, url, branch, clonedAt, …)
```

Each repo gets a UUID generated with `crypto.randomUUID()`. The JSON file alongside it stores all metadata — no database required.

Responsibilities:

- Start an HTTP server on `127.0.0.1`.
- Allow requests only from approved frontend origins.
- Validate GitHub URLs before cloning.
- Clone public repositories.
- Support private repositories later through a local GitHub token.
- Pull or fetch changes for existing repositories.
- Scan markdown files recursively.
- Ignore heavy or unsafe folders such as `.git`, `node_modules`, `.next`, `dist`, `build`, and vendor caches.
- Return normalized repo, file tree, file metadata, and file content responses.
- Keep all repo data on the user's machine.

## Frontend Responsibilities

The frontend remains the reading experience and source manager.

Responsibilities:

- Detect whether the local server is running.
- Show existing browser folder/file picker controls.
- Show a new GitHub URL clone flow when the local server is available.
- Support manual connection to a custom local server URL.
- Render files from both source modes in the same viewer.
- Preserve existing markdown parsing, frontmatter display, TOC, syntax highlighting, keyboard shortcuts, and theme behavior.
- Store lightweight local-server source metadata in IndexedDB.
- Avoid uploading document contents to Vercel.

## Suggested API Contract

Base URL:

```text
http://127.0.0.1:4873
```

Health check:

```http
GET /health
```

Response:

```json
{
  "ok": true,
  "name": "mdocs-server",
  "version": "0.1.0"
}
```

List repositories:

```http
GET /api/repos
```

Clone repository:

```http
POST /api/repos/clone
Content-Type: application/json

{
  "url": "https://github.com/owner/repo",
  "branch": "main"
}
```

Sync repository:

```http
POST /api/repos/:repoId/sync
```

List markdown files:

```http
GET /api/repos/:repoId/files
```

Read markdown file:

```http
GET /api/repos/:repoId/files/:fileId
```

The file read response should include enough metadata for the existing viewer UI.

```json
{
  "id": "docs/intro.md",
  "repoId": "github.com/owner/repo",
  "name": "intro.md",
  "relPath": "docs/intro.md",
  "content": "# Intro\n",
  "lastModified": 1760000000000,
  "size": 128
}
```

## Security Boundaries

The local server must be conservative because it can read and write local files.

Rules:

- Bind to `127.0.0.1` by default, not `0.0.0.0`.
- Restrict CORS to trusted origins, such as the production Vercel URL and local dev URL.
- Require an allowlisted origin header for mutating routes.
- Reject non-GitHub URLs in the first version.
- Never accept arbitrary filesystem paths from the browser.
- Resolve every repo path inside the configured `.mdocs/repos` directory.
- Prevent path traversal when reading file content.
- Limit clone and file scan sizes.
- Do not expose environment variables, arbitrary directory listings, or shell command output.
- Prefer direct `git` invocation with strict argument arrays, not shell string composition.

## Data Flow: Browser File API Mode

```text
User clicks "Open folder"
  -> Browser File System Access picker
  -> Existing recursive markdown scan
  -> Existing viewer store
  -> Existing file tree and markdown renderer
```

This flow should not be removed or replaced.

## Data Flow: Local Server Mode

```text
User runs `npx mdocs server`
  -> Server starts on localhost
  -> Vercel frontend detects /health
  -> User enters GitHub URL
  -> Frontend POSTs /api/repos/clone
  -> Server clones into .mdocs/repos
  -> Server scans markdown files
  -> Frontend renders returned file tree
  -> User opens file
  -> Frontend GETs file content from localhost
  -> Existing markdown renderer displays it
```

## Sync Flow

Manual sync:

```text
User clicks Sync
  -> POST /api/repos/:repoId/sync
  -> Server runs git fetch/pull
  -> Server rescans markdown files
  -> Frontend refreshes file tree and active file
```

Auto sync:

```text
Server timer checks tracked repos
  -> Compare local HEAD with remote HEAD
  -> Pull when changed
  -> Notify frontend through polling or server-sent events
```

Manual sync should ship first. Auto sync can come later.

## Implementation Phases

### Phase 1: Local Server MVP

- Add `npx mdocs server`.
- Add `/health`.
- Add repo clone endpoint.
- Add repo list endpoint.
- Add markdown file scan endpoint.
- Add markdown file read endpoint.

### Phase 3: Viewer Integration

- Show cloned repos in the existing sidebar.
- Let active files come from browser handles or localhost API.
- Reuse current markdown parsing/rendering.
- Add loading, offline, and reconnect states for localhost mode.

### Phase 4: Sync

- Add manual sync.
- Track latest commit hash.
- Refresh file tree after sync.
- Warn when the local server is not running.

### Phase 5: Hardening

- Add private repo authentication.
- Add origin allowlist configuration.
- Add clone size limits.
- Add repo deletion.
- Add auto sync.
- Add server-sent events or polling for sync status.

## Non Goals

- Do not clone repositories inside Vercel Functions.
- Do not upload user markdown files to Vercel.
- Do not remove the current browser-only local file workflow.
- Do not require the local server for users who only want to open files manually.

