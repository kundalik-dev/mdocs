# @iprep/modcs-server

Local HTTP server for mDocs. Clones public GitHub repositories, scans them for markdown files, and exposes their content over a REST API.

## Package status

This package is private/internal. It is bundled into `@iprep/mdocs` at CLI build time and is not published separately.

## Requirements

- Node.js >= 18
- Git (must be available in `PATH` for clone/sync operations)

## Programmatic usage

### `startServer(overrides?)`

Starts the server and returns a Node.js `http.Server`.

```ts
import { startServer } from '@iprep/modcs-server';

const server = await startServer({
  port: 5540,
  host: '127.0.0.1',
  dataDir: '/path/to/project',
  origins: ['http://localhost:3000'],
});

console.log('Server started');
```

### `createApp(config)`

Creates and returns an Express app without starting it — useful for testing or custom server setups.

```ts
import { createApp, parseConfig } from '@iprep/modcs-server';

const config = parseConfig({ port: 5540 });
const app = createApp(config);

app.listen(config.port, config.host);
```

### `parseConfig(overrides?)`

Merges overrides with environment variables and built-in defaults.

```ts
import { parseConfig } from '@iprep/modcs-server';

const config = parseConfig({ port: 5000 });
// { port: 5000, host: '127.0.0.1', dataDir: process.cwd(), origins: [...] }
```

## Configuration

| Option | Env var | Default |
|---|---|---|
| `port` | `PORT` | `5540` |
| `host` | `HOST` | `127.0.0.1` |
| `dataDir` | `DATA_DIR` | `process.cwd()` |
| `origins` | — | `['http://localhost:3000', 'http://127.0.0.1:3000', 'https://mdocs.vercel.app']` |

## Standalone usage

Run the server directly without the CLI:

```sh
node node_modules/@iprep/modcs-server/dist/index.js
```

Or with environment variables:

```sh
PORT=5000 DATA_DIR=/my/project node node_modules/@iprep/modcs-server/dist/index.js
```

## REST API

Base URL: `http://127.0.0.1:5540`

---

### Health

#### `GET /health`

Returns server status.

```jsonc
// 200 OK
{ "ok": true, "name": "modcs-server", "version": "0.1.0" }
```

---

### Repositories

#### `GET /api/repos`

Lists all tracked repositories.

```jsonc
// 200 OK
[
   
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "owner/repo",
    "url": "https://github.com/owner/repo",
    "branch": "main",
    "clonedAt": "2026-05-09T10:00:00.000Z",
    "lastSyncedAt": null,
    "currentCommit": "abc1234...",
    "fileCount": 12
  }
]
```

---

#### `POST /api/repos/clone`

Clones a public GitHub repository and starts tracking it.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | `string` | Yes | Public GitHub HTTPS URL (`https://github.com/owner/repo`) |
| `branch` | `string` | No | Branch to clone (defaults to the repo's default branch) |

```sh
curl -X POST http://127.0.0.1:5540/api/repos/clone \
  -H "Content-Type: application/json" \
  -d ' "url": "https://github.com/owner/repo", "branch": "main"}'
```

```jsonc
// 201 Created
 
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "owner/repo",
  "url": "https://github.com/owner/repo",
  "branch": "main",
  "clonedAt": "2026-05-09T10:00:00.000Z",
  "lastSyncedAt": null,
  "currentCommit": "abc1234...",
  "fileCount": 12
}
```

> Only public `https://github.com/owner/repo` URLs are accepted. SSH URLs and non-GitHub hosts are rejected.

---

#### `POST /api/repos/:repoId/sync`

Pulls the latest changes for a tracked repository (`git pull --ff-only`).

```sh
curl -X POST http://127.0.0.1:5540/api/repos/550e8400-e29b-41d4-a716-446655440000/sync
```

Returns the updated `RepoMeta` object.

---

#### `DELETE /api/repos/:repoId`

Removes a repository from tracking and deletes its local clone.

```sh
curl -X DELETE http://127.0.0.1:5540/api/repos/550e8400-e29b-41d4-a716-446655440000
```

```
204 No Content
```

---

### Files

#### `GET /api/repos/:repoId/files`

Lists all markdown files in the repository (`.md`, `.mdx`, `.markdown`). Files larger than 1 MB and common non-doc directories (`node_modules`, `dist`, `.git`, etc.) are excluded.

```jsonc
// 200 OK
[
   
    "id": "docs/intro.md",
    "repoId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "intro.md",
    "relPath": "docs/intro.md",
    "size": 1024,
    "lastModified": 1746784800000
  }
]
```

---

#### `GET /api/repos/:repoId/files/:path`

Returns the content of a specific file.

```sh
curl http://127.0.0.1:5540/api/repos/550e8400-e29b-41d4-a716-446655440000/files/docs/intro.md
```

```jsonc
// 200 OK
 
  "id": "docs/intro.md",
  "repoId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "intro.md",
  "relPath": "docs/intro.md",
  "size": 1024,
  "lastModified": 1746784800000,
  "content": "# Introduction\n\nWelcome to the docs..."
}
```

---

## TypeScript types

All public types are exported:

```ts
import type { Config, RepoMeta, FileRef, FileContent } from '@iprep/modcs-server';
```

## Security

- CORS is enforced — only origins listed in `config.origins` are allowed.
- Only `https://github.com` URLs are accepted for cloning.
- File reads are path-traversal-safe — resolved paths are checked to stay within the clone directory.
- Repository IDs are validated against path traversal before any file operation.

## Related packages

- [`@iprep/mdocs`](https://www.npmjs.com/package/@iprep/mdocs) — CLI wrapper around this server
