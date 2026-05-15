# @iprep/mdocks

Command-line interface for mDocs — spins up a local documentation server that serves markdown files from cloned GitHub repositories.

## Installation

```sh
npm install -g @iprep/mdocks
```

Or run without installing:

```sh
npx @iprep/mdocks start
```

## Requirements

- Node.js >= 18
- Git (must be available in `PATH`)

## Commands

### `modcs setup`

Initializes the `.mdocs/` project structure in the target directory.

```sh
modcs setup [options]
```

| Option | Description | Default |
|---|---|---|
| `-d, --data-dir <dir>` | Directory to initialize | current working directory |

Creates:
```
.mdocs/
└── repos/
```

### `modcs start`

Starts the mDocs local HTTP server. If `.mdocs/` does not exist, it is initialized automatically.

```sh
modcs start [options]
```

| Option | Description | Default |
|---|---|---|
| `-p, --port <port>` | Port to listen on | `5540` |
| `-H, --host <host>` | Host to bind to | `127.0.0.1` |
| `-d, --data-dir <dir>` | Directory containing `.mdocs/` | current working directory |
| `-o, --origin <origin>` | Extra CORS origin to allow | — |

**Examples:**

```sh
# Start with defaults
modcs start

# Custom port
modcs start --port 5000

# Allow a custom frontend origin
modcs start --origin http://localhost:5173

# Point at a specific data directory
modcs start --data-dir /path/to/project
```

Once running, the server is available at `http://127.0.0.1:5540` by default.

## Typical workflow

```sh
# 1. Initialize in your project
cd my-project
modcs setup

# 2. Start the server
modcs start

# 3. Use the REST API to clone a repo and browse its docs
curl -X POST http://127.0.0.1:5540/api/repos/clone \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/owner/repo"}'
```

## REST API

The CLI delegates all HTTP logic to `@iprep/modcs-server`. See the [`@iprep/modcs-server` README](../server/README.md) for the full API reference.

## Related packages

- [`@iprep/modcs-server`](https://www.npmjs.com/package/@iprep/modcs-server) — the underlying HTTP server (used internally by this CLI)
