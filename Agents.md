# mDocs — Claude Reference

Local documentation server monorepo. Users run `npx @iprep/mdocs start` to start a local server that clones GitHub repos and serves their markdown files to a hosted frontend viewer.

---

## Repo structure

```
packages/
  cli/      — @iprep/mdocs   — the npx-able CLI package (`modcs` binary)
  server/   — @iprep/modcs-server  — the Express HTTP server (library + standalone)
apps/
  frontend/ — Next.js 16 viewer (React 19, Zustand 5, Tailwind, shadcn/base-ui)
docs/       — project documentation (API.md, ARCHITECTURE.md, TASKS.md, etc.)
```

Per-package deep references:
- [`packages/cli/CLAUDE.md`](packages/cli/CLAUDE.md) — CLI commands, options, decisions
- [`packages/server/CLAUDE.md`](packages/server/CLAUDE.md) — REST API, config, security, data layout

---

## Monorepo tooling

- **Package manager:** pnpm with workspaces (`pnpm-workspace.yaml`)
- **Build:** tsup (ESM, node18, dts output) for packages; Next.js/Turbopack for frontend
- **Language:** TypeScript throughout

```sh
pnpm install          # install all deps
pnpm build            # build server then cli (order matters)
pnpm build:server     # build server only
pnpm build:cli        # build cli only
pnpm dev:server       # run server in dev mode (tsx watch)
pnpm dev:cli          # run cli in dev mode (tsx)
cd apps/frontend && pnpm dev   # Next.js dev server on :3000
```

`@iprep/mdocs` depends on `@iprep/modcs-server` via `workspace:*`. Always build server before cli.

---

## How it works end-to-end

1. User runs `npx @iprep/mdocs start`
2. CLI creates `~/.mdocs/repos/` silently if missing, starts `@iprep/modcs-server` on `http://127.0.0.1:5540`
3. Browser opens to `https://idocs-md-viewer.vercel.app/` (the frontend)
4. Frontend connects to local server — user clones a GitHub repo via the UI
5. Server clones into `~/.mdocs/repos/<uuid>/`, scans `.md`/`.mdx` files, returns `FileRef[]`
6. Frontend fetches and renders markdown; files are never uploaded to Vercel

---

## Key constraints

- **`.mdocs/` is always at `~/.mdocs/`** — global per user, not per cwd
- **GitHub HTTPS only** — only `https://github.com/owner/repo` URLs accepted
- **Private repos** need `GITHUB_TOKEN=ghp_... modcs start` or `--github-token`
- **Node >= 18** required
- **Git must be in PATH** — server spawns `git clone/pull` as child process
- **Never use shell string composition for git** — always strict argument arrays

---

## Publishing

The server publishes as `@iprep/modcs-server`, while the CLI publishes as `@iprep/mdocs` with the `modcs` binary. See `docs/PUBLISHING.md`.

```sh
cd packages/server && pnpm publish --access public
cd packages/cli    && pnpm publish --access public
```

Current versions: `@iprep/modcs-server@0.1.0`, `@iprep/mdocs@0.1.0`

---

## Frontend — `apps/frontend`

**Stack:** Next.js 16.2.5 (App Router, Turbopack), React 19, Zustand 5, Tailwind CSS, base-ui (shadcn fork), lucide-react, idb-keyval, react-markdown, shiki.

### Key source layout

```
src/
  app/
    viewer/page.tsx         — main viewer page (sidebar + content + TOC)
  components/viewer/
    source-switcher.tsx     — project switcher dropdown (full sidebar width)
    file-tree.tsx           — file tree for the active source
    file-picker.tsx         — open folder / open files (empty state)
    server-panel.tsx        — local server connection panel (bottom of sidebar)
    markdown-view.tsx       — react-markdown renderer
    metadata-card.tsx       — frontmatter display
    toc.tsx                 — table of contents
    code-block.tsx          — shiki syntax highlighting
  hooks/
    use-file-content.ts     — reads active file; branches on sourceType
    use-keyboard-shortcuts.ts
  lib/
    local-server-client.ts  — ServerClient class (typed fetch wrappers)
    idb.ts                  — IndexedDB persistence (idb-keyval)
    fs.ts                   — File System Access API helpers
    markdown.ts             — parseMarkdown, extractToc
  store/
    viewer-store.ts         — Zustand store (all state + actions)
```

---

### Type system — discriminated unions

**File types** (`viewer-store.ts`):
```ts
type BrowserViewerFile = {
  id: string; sourceId: string; sourceType: "browser-fs";
  name: string; relPath: string; dirSegments: string[];
  handle: FileSystemFileHandle;
};

type ServerViewerFile = {
  id: string; sourceId: string; sourceType: "local-server";
  name: string; relPath: string; dirSegments: string[];
  repoId: string; serverUrl: string;
};

type ViewerFile = BrowserViewerFile | ServerViewerFile;
```

**Source types** (`viewer-store.ts`):
```ts
type BrowserSource = {
  id: string; kind: "folder" | "files"; name: string;
  directoryHandle?: FileSystemDirectoryHandle;
  fileHandles?: FileSystemFileHandle[];
  files: BrowserViewerFile[];
  permission: "granted" | "prompt" | "denied" | "unknown";
};

type LocalServerSource = {
  id: string; kind: "local-server"; name: string;
  repoId: string; serverUrl: string; branch: string;
  files: ServerViewerFile[];
  permission: "granted";
  syncing: boolean;
};

type ViewerSource = BrowserSource | LocalServerSource;
```

---

### Viewer store — key state

| Field | Type | Purpose |
|---|---|---|
| `sources` | `ViewerSource[]` | All open sources (browser + server) |
| `activeSourceId` | `string \| null` | Which project is shown in sidebar |
| `activeFileId` | `string \| null` | Currently open file |
| `serverUrl` | `string` | Local server base URL (default: `http://127.0.0.1:5540`) |
| `serverStatus` | `"disconnected" \| "connecting" \| "connected" \| "error"` | Health poll result |
| `sidebarOpen` | `boolean` | Sidebar visibility |
| `tocOpen` | `boolean` | TOC rail visibility |

**Key actions:**
- `addFolder(handle)` — adds folder source, sets it as `activeSourceId`
- `addFiles(handles)` — adds file source, sets it as `activeSourceId`
- `addServerSource(repo, files)` — adds cloned repo, sets it as `activeSourceId`
- `setActiveSource(id)` — switches project; resets `activeFileId` to first file of that source
- `removeSource(id)` — removes source; switches `activeSourceId` to next source if active one removed
- `syncServerSource(id)` — calls `client.syncRepo` then `listFiles`, updates file list
- `setServerUrl(url)` — persists URL to IDB, updates state
- `nextFile()` / `prevFile()` — navigate within active source only

**Selectors:**
```ts
selectActiveFile(s)   // ViewerFile | null
selectActiveSource(s) // ViewerSource | null
selectAllFiles(s)     // ViewerFile[]
```

---

### IDB persistence (`lib/idb.ts`)

DB name: `mdocs-db`, store: `mdocs-store`

| Key | Type | Content |
|---|---|---|
| `sources:v1` | `StoredSource[]` | Browser-fs sources (with FileSystem handles) |
| `serverSources:v1` | `StoredServerSource[]` | Server sources (plain JSON, no handles) |
| `serverUrl:v1` | `string` | Last used server URL |
| `activeFileId:v1` | `string \| null` | Last active file |
| `sidebarOpen:v1` | `boolean` | Sidebar state |
| `tocOpen:v1` | `boolean` | TOC state |

`StoredServerSource`: `{ id, kind: "local-server", name, repoId, serverUrl, branch, addedAt }`

On hydration: browser sources restore with permission checks; server sources try to re-fetch file lists from the server (silently skipped if server offline).

---

### Local server client (`lib/local-server-client.ts`)

```ts
class ServerClient {
  constructor(readonly baseUrl: string) {}
  checkHealth(): Promise<HealthResponse>    // AbortSignal.timeout(3000)
  listRepos(): Promise<RepoMeta[]>
  cloneRepo(url, branch?): Promise<RepoMeta>
  syncRepo(repoId): Promise<RepoMeta>
  listFiles(repoId): Promise<FileRef[]>
  readFile(repoId, relPath): Promise<FileContent>
  deleteRepo(repoId): Promise<void>
}
```

Types mirror the server's `types.ts` exactly but are defined locally — do not import from `@iprep/modcs-server`.

---

### `use-file-content` hook

Signature: `useFileContent(file: ViewerFile | null): FileContentState`

Branches on `file.sourceType`:
- `"browser-fs"` — reads via `FileSystemFileHandle`, polls every 2s for mtime changes (live reload)
- `"local-server"` — single fetch via `ServerClient(file.serverUrl).readFile(file.repoId, file.relPath)`, no polling

State resets when `file` identity changes (render-phase `setState` pattern).

---

### Sidebar layout (`viewer/page.tsx`)

```
┌──────────────────────────────┐
│ [SourceSwitcher]              │  ← full sidebar width, opens dropdown
├──────────────────────────────┤
│ [FileTree]                    │  ← only active source's files
│   (scroll area)               │
├──────────────────────────────┤
│ [ServerPanel]                 │  ← collapsible, pinned to bottom
└──────────────────────────────┘
```

**SourceSwitcher dropdown** contains: source list (switch project), Add folder, Add files, Clear all.  
No separate Folder/Files/Trash buttons anywhere else in the sidebar — all in the dropdown.

**ServerPanel** (bottom of sidebar, collapsible):
- Polls `/health` every 10s
- Status dot: green=connected, yellow=connecting, red=offline
- URL edit field (click to edit)
- Clone form (shown when connected): GitHub URL + branch + Clone button
- Lists repos already on server with Add/Added buttons

**FileTree** shows only the active source (selected via SourceSwitcher).  
SourceCard for `local-server` kind: Globe icon, branch label, Sync button instead of "Grant access".

---

### Important gotcha — smart quotes

When Claude writes edits containing string literals, it sometimes emits Unicode smart quotes (`"` `"` / U+201C U+201D) instead of ASCII `"`. Turbopack rejects these as parse errors ("Unexpected character"). After writing any `.ts`/`.tsx` file, run:

```powershell
$f = "path\to\file.tsx"
$c = [System.IO.File]::ReadAllText($f, [System.Text.Encoding]::UTF8)
$c = $c.Replace([char]0x201C,[char]0x22).Replace([char]0x201D,[char]0x22)
[System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
```

Or sweep all recently modified files at once:
```powershell
Get-ChildItem "apps\frontend\src" -Recurse -Include "*.ts","*.tsx" |
  Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-60) } |
  ForEach-Object {
    $c = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
    $fixed = $c.Replace([char]0x201C,[char]0x22).Replace([char]0x201D,[char]0x22).Replace([char]0x2018,[char]0x27).Replace([char]0x2019,[char]0x27)
    if ($c -ne $fixed) { [System.IO.File]::WriteAllText($_.FullName, $fixed, [System.Text.Encoding]::UTF8) }
  }
```
