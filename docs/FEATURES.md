# mDocs Feature Plan

This document describes the planned feature set for keeping the current browser file API workflow and adding optional localhost backend support for GitHub repositories.

## Existing Features To Preserve

The current viewer already supports a strong local-first workflow. These features must keep working:

- Open a local folder through the browser File System Access API.
- Open individual markdown files through the browser picker.
- Recursively discover `.md`, `.markdown`, and `.mdx` files.
- Ignore generated or heavy directories such as `.git`, `node_modules`, `.next`, `dist`, and `build`.
- Store selected file handles and active file state in IndexedDB.
- Rehydrate sources after page reload when permissions allow.
- Render GitHub-flavored Markdown.
- Parse frontmatter and display metadata.
- Build a table of contents from headings.
- Highlight code blocks with Shiki.
- Copy code blocks.
- Refresh active file content when the local file changes.
- Toggle sidebar and table of contents.
- Navigate files with keyboard shortcuts.
- Switch light and dark themes.

The new backend mode should extend the product, not replace this mode.

## New Feature: Local Server Connection

Users should be able to run:

```bash
npx mdocs server
```

Then open the hosted frontend on Vercel and connect to:

```text
http://127.0.0.1:4873
```

Frontend behavior:

- Auto-detect the local server with `GET /health`.
- Show connected, disconnected, and error states.
- Allow changing the localhost URL and port.
- Remember the last successful local server URL in IndexedDB.
- Keep the app usable without the local server.

## New Feature: Clone GitHub Repository

When the local server is available, the viewer should show a GitHub URL input.

Supported first version:

- Public GitHub HTTPS URLs.
- Optional branch input.
- Clone into `.mdocs/repos`.
- Scan markdown files after clone.
- Add the repo to the sidebar as a source.

Example:

```text
https://github.com/owner/repo
```

Validation:

- Accept only GitHub repo URLs in the first version.
- Normalize URLs to `github.com/owner/repo`.
- Reject URLs with unexpected protocols.
- Reject empty owner or repo names.
- Show clear error messages for invalid URLs, clone failures, and missing git.

## New Feature: Repository Library

The local server should track cloned repositories.

Repo metadata:

```ts
type RepoSummary = {
  id: string;
  host: "github.com";
  owner: string;
  name: string;
  url: string;
  branch: string;
  localPath: string;
  currentCommit: string | null;
  lastSyncedAt: number | null;
  fileCount: number;
};
```

Frontend behavior:

- List cloned repos.
- Show repo name, branch, file count, and sync status.
- Let the user open a repo's markdown tree.
- Let the user remove a repo from the mDocs library later.

## New Feature: Unified File Tree

The sidebar should be able to show files from both source types.

Browser file source:

```text
Local folder
  guide.md
  docs/
    intro.md
```

Local server source:

```text
owner/repo
  README.md
  docs/
    intro.md
```

Shared file shape:

```ts
type ViewerFile = {
  id: string;
  sourceId: string;
  sourceType: "browser-fs" | "local-server";
  name: string;
  relPath: string;
  dirSegments: string[];
  lastModified?: number;
  size?: number;
};
```

The renderer should not care where the file came from. It should receive markdown text and metadata.

## New Feature: Read Files From Local Server

When a user selects a local-server file, the frontend should call the backend API instead of `FileSystemFileHandle`.

```http
GET /api/repos/:repoId/files/:fileId
```

Frontend states:

- Loading file.
- File loaded.
- Local server offline.
- File missing after sync.
- Permission/authentication needed for private repo.

The existing markdown rendering pipeline should still be used after content is loaded.

## New Feature: Manual Repository Sync

Each cloned repo should have a Sync button.

Behavior:

- Call `POST /api/repos/:repoId/sync`.
- Server fetches or pulls latest changes.
- Server rescans markdown files.
- Frontend updates file tree.
- If the active file still exists, reload its content.
- If the active file was deleted or renamed, show a friendly missing-file state.

Status labels:

- Synced
- Syncing
- Update available
- Failed
- Local server offline

## New Feature: Optional Auto Sync

Auto sync should come after manual sync.

Possible behavior:

- User enables auto sync per repo.
- Local server checks remote HEAD every few minutes.
- Server pulls when a new commit exists.
- Frontend refreshes via polling or server-sent events.

Auto sync should have clear limits so it does not surprise users with background network activity.

## New Feature: Local Server CLI

The package should provide a command:

```bash
npx mdocs server
```

Useful CLI options:

```bash
npx mdocs server --port 4873
npx mdocs server --host 127.0.0.1
npx mdocs server --data-dir ~/.mdocs
npx mdocs server --origin https://mdocs.vercel.app
```

CLI output should be simple:

```text
mDocs server running
URL: http://127.0.0.1:4873
Data: ~/.mdocs
Allowed origins:
  - https://mdocs.vercel.app
  - http://localhost:3000
```

## New Feature: Private Repo Support

Private repository support should not be part of the first MVP unless needed immediately.

Later options:

- Ask the user for a GitHub personal access token.
- Store the token locally only.
- Use git credential helpers or authenticated clone URLs carefully.
- Add a local settings screen for removing tokens.

Rules:

- Never send tokens to Vercel.
- Never store tokens in browser local storage.
- Prefer storing tokens in the local server data directory with restricted file permissions.

## User Experience Requirements

The UI should make the two modes clear without making the product feel split.

Recommended source controls:

- Open folder
- Open files
- Connect local server
- Clone GitHub repo
- Sync repo

Empty states:

- No sources yet: show browser file pickers and local server connection.
- Local server unavailable: explain that browser file mode still works.
- Repo has no markdown files: show repo metadata and suggest syncing or choosing another repo.

## Safety Requirements

Local server mode must be designed defensively.

Required:

- Bind to `127.0.0.1`.
- Use strict CORS allowlist.
- Validate origin on mutating requests.
- Validate GitHub URLs.
- Clone only under `.mdocs/repos`.
- Read only markdown files from known cloned repos.
- Prevent path traversal.
- Limit file size for reads.
- Limit repo scan depth or total files.
- Avoid shell string commands.

## Suggested Delivery Order

1. Add local server API client in the frontend.
2. Add source mode types and store changes.
3. Build local server `/health`.
4. Add frontend connection status.
5. Add clone endpoint in local server.
6. Add repo list and file list endpoints.
7. Add server-backed file loading in viewer.
8. Add manual sync.
9. Add repo settings and deletion.
10. Add private repo support.
11. Add auto sync.

## Acceptance Criteria

Browser File API mode:

- Existing folder picker still works.
- Existing file picker still works.
- Existing markdown rendering still works.
- Existing IndexedDB restore still works.

Local Server mode:

- User can run `npx mdocs server`.
- Vercel frontend can detect the server.
- User can enter a GitHub URL and clone a repo.
- Cloned markdown files appear in the sidebar.
- User can open and read cloned markdown files.
- User can manually sync a repo.
- User can keep using browser file mode when the local server is closed.

