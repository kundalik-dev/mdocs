# mDocs Server API

Base URL: `http://127.0.0.1:5540`

---

## Health

### `GET /health`

Returns server status. Use this to check if the server is running before connecting the frontend.

**Response**
```json
{ "ok": true, "name": "modcs-server", "version": "0.1.4" }
```

**Test**
```bash
curl http://127.0.0.1:5540/health
```

---

## Repositories

### `GET /api/repos`

List all cloned repositories.

**Response** — array of `RepoMeta`
```json
[
  {
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

**Test**
```bash
curl http://127.0.0.1:5540/api/repos
```

---

### `POST /api/repos/clone`

Clone a public GitHub repository. The repo is stored under `.mdocs/repos/<uuid>/` and a metadata JSON file is written alongside it.

**Body**
```json
{ "url": "https://github.com/owner/repo", "branch": "main" }
```

`branch` is optional — defaults to the repo's default branch.

**Response** `201 Created` — the new `RepoMeta` object.

**Test**
```bash
curl -X POST http://127.0.0.1:5540/api/repos/clone \
  -H "Content-Type: application/json" \
  -d '{"url":"https://github.com/sindresorhus/awesome"}'
```

**Errors**
| Status | Reason |
|--------|--------|
| `400` | Missing or non-GitHub URL |
| `500` | git clone failed (network, auth, typo) |

---

### `POST /api/repos/:repoId/sync`

Pull latest changes for an existing repo (`git pull --ff-only`), rescan markdown files, and update the metadata JSON.

**Response** — updated `RepoMeta`.

**Test**
```bash
# replace <id> with the uuid from /api/repos
curl -X POST http://127.0.0.1:5540/api/repos/<id>/sync
```

---

### `DELETE /api/repos/:repoId`

Remove a cloned repo — deletes both the clone folder and the `.json` metadata file.

**Response** `204 No Content`

**Test**
```bash
curl -X DELETE http://127.0.0.1:5540/api/repos/<id>
```

---

## Files

### `GET /api/repos/:repoId/files`

List all markdown files (`.md`, `.mdx`, `.markdown`) found in the repo. Ignores `node_modules`, `.next`, `dist`, `build`, etc.

**Response** — array of `FileRef`
```json
[
  {
    "id": "docs/intro.md",
    "repoId": "550e8400-...",
    "name": "intro.md",
    "relPath": "docs/intro.md",
    "size": 2048,
    "lastModified": 1746784800000
  }
]
```

**Test**
```bash
curl http://127.0.0.1:5540/api/repos/<id>/files
```

---

### `GET /api/repos/:repoId/files/:path`

Read a single markdown file by its relative path. The path may include subdirectories.

**Response** — `FileContent` (FileRef + `content` string)
```json
{
  "id": "docs/intro.md",
  "repoId": "550e8400-...",
  "name": "intro.md",
  "relPath": "docs/intro.md",
  "size": 2048,
  "lastModified": 1746784800000,
  "content": "# Intro\n\nWelcome..."
}
```

**Test**
```bash
curl "http://127.0.0.1:5540/api/repos/<id>/files/README.md"
curl "http://127.0.0.1:5540/api/repos/<id>/files/docs/intro.md"
```

**Errors**
| Status | Reason |
|--------|--------|
| `400` | Path traversal attempt detected |
| `404` | Repo or file not found |

---

## Storage layout

All data lives inside `.mdocs/` in the directory where `modcs start` was run:

```
.mdocs/
└── repos/
    ├── <uuid>/          ← actual git clone
    └── <uuid>.json      ← RepoMeta for that clone
```

No database is used. Each JSON file is the source of truth for that repo's metadata.

---

## Running the server

```bash
# Start with defaults (127.0.0.1:5540)
npx @iprep/mdocs start

# Custom port / host
npx @iprep/mdocs start --port 5000 --host localhost

# Custom data directory (where .mdocs/ will be created)
npx @iprep/mdocs start --data-dir /path/to/project

# Allow a custom frontend origin
npx @iprep/mdocs start --origin http://localhost:4000
```

Default allowed CORS origins:
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- `https://mdocs.vercel.app`
