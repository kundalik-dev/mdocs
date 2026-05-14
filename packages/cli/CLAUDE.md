# mdocs CLI Reference

CLI wrapper around `@mdocs/server`. Provides the `mdocs` binary with `serve` and `setup` commands. Published to npm as `mdocs`; users run it via `npx mdocs serve` or a global install.

## Key files

```
src/
  index.ts           — commander program, command definitions + options
  types.ts           — RepoMeta (local mirror of server type)
  commands/
    serve.ts         — serve command handler (start server, open browser)
    setup.ts         — setup command handler (create .mdocs/ structure)
  lib/
    mdocs.ts         — filesystem helpers: resolveDataDir, createMdocsStructure, etc.
    banner.ts        — printBanner() — gradient figlet ascii art on startup
```

## Commands

### `mdocs serve`

```
-p, --port <port>           Port (default: 4873)
-H, --host <host>           Host (default: 127.0.0.1)
-d, --data-dir <dir>        Override dataDir (default: homedir())
-o, --origin <origin>       Extra CORS origin to allow
-t, --github-token <token>  GitHub PAT for private repos (or GITHUB_TOKEN env var)
```

**Behaviour:**
1. Resolves `dataDir` via `resolveDataDir(options.dataDir)` — defaults to `os.homedir()`
2. Silently creates `~/.mdocs/repos/` if missing (no prompt)
3. Starts `@mdocs/server`
4. Prints banner + server URL to stdout
5. Opens `https://idocs-md-viewer.vercel.app/` in the default browser via `open`
6. Handles `SIGINT` for clean shutdown

### `mdocs setup`

```
-d, --data-dir <dir>   Target directory (default: homedir())
```

Creates `<dataDir>/.mdocs/repos/` recursively. Used internally by `serve` — rarely called directly.

## Key helpers (`lib/mdocs.ts`)

| Function | Purpose |
|---|---|
| `resolveDataDir(dir?)` | No arg → `homedir()`. Absolute path → as-is. Relative → resolved against `cwd()` |
| `mdocsExists(cwd)` | Checks `<cwd>/.mdocs/` exists |
| `reposDirExists(cwd)` | Checks `<cwd>/.mdocs/repos/` exists |
| `createMdocsStructure(cwd)` | `mkdirSync(<cwd>/.mdocs/repos/, { recursive: true })` |

## Important decisions

- **`dataDir` always defaults to `homedir()`** — repos are global to the user, not tied to the directory `mdocs serve` is run from. This means one `.mdocs/` at `~/.mdocs/` regardless of project.
- **No setup prompt** — if `.mdocs/` is missing, `serve` silently runs `runSetup()` and continues. The old `inquirer` confirm prompt was removed; `inquirer` dependency dropped entirely.
- **Browser auto-open** — `open(VIEWER_URL)` is called after the server is confirmed listening. Uses the `open` npm package (cross-platform: `start` on Windows, `open` on macOS, `xdg-open` on Linux). `void` is used since we don't await it.
- **GitHub token** — passed through to `startServer({ githubToken })`. Can also be set via `GITHUB_TOKEN` env var (handled in `@mdocs/server`'s `parseConfig`).

## Dependencies

| Package | Why |
|---|---|
| `@mdocs/server` | The actual HTTP server |
| `commander` | CLI argument parsing |
| `chalk` | Terminal colours |
| `open` | Cross-platform browser launcher |
| `figlet` + `gradient-string` | Startup banner |

## Build

```sh
pnpm build        # tsup — outputs dist/index.js + dist/index.d.ts
pnpm typecheck    # tsc --noEmit
```

`tsup.config.ts`: ESM only, target node18, `dts: true`, `clean: true`, `shims: true`.

The `bin` field in `package.json` points to `./dist/index.js` which has a `#!/usr/bin/env node` shebang (injected by tsup's `shims: true`).
