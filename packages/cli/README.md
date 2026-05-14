# mdocs

Command-line interface for mDocs — spins up a local documentation server that serves markdown files from cloned GitHub repositories.

## Installation

```sh
npm install -g mdocs
```

Or run without installing:

```sh
npx mdocs <command>
```

## Requirements

- Node.js >= 18
- Git (must be available in `PATH`)

## Commands

### `mdocs setup`

Initializes the `.mdocs/` project structure in the target directory.

```sh
mdocs setup [options]
```

| Option | Description | Default |
|---|---|---|
| `-d, --data-dir <dir>` | Directory to initialize | current working directory |

Creates:
```
.mdocs/
└── repos/
```

### `mdocs serve`

Starts the mDocs local HTTP server. If `.mdocs/` does not exist, you will be prompted to initialize it first.

```sh
mdocs serve [options]
```

| Option | Description | Default |
|---|---|---|
| `-p, --port <port>` | Port to listen on | `4873` |
| `-H, --host <host>` | Host to bind to | `127.0.0.1` |
| `-d, --data-dir <dir>` | Directory containing `.mdocs/` | current working directory |
| `-o, --origin <origin>` | Extra CORS origin to allow | — |

**Examples:**

```sh
# Start with defaults
mdocs serve

# Custom port
mdocs serve --port 5000

# Allow a custom frontend origin
mdocs serve --origin http://localhost:5173

# Point at a specific data directory
mdocs serve --data-dir /path/to/project
```

Once running, the server is available at `http://127.0.0.1:4873` by default.

## Typical workflow

```sh
# 1. Initialize in your project
cd my-project
mdocs setup

# 2. Start the server
mdocs serve

# 3. Use the REST API to clone a repo and browse its docs
curl -X POST http://127.0.0.1:4873/api/repos/clone \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/owner/repo"}'
```

## REST API

The CLI delegates all HTTP logic to `@mdocs/server`. See the [`@mdocs/server` README](../server/README.md) for the full API reference.

## Related packages

- [`@mdocs/server`](https://www.npmjs.com/package/@mdocs/server) — the underlying HTTP server (used internally by this CLI)
