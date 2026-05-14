# Publishing Guide

Only one npm package is published:

| Package | Path |
|---|---|
| `@iprep/mdocs` | `packages/cli` |

`packages/server` is private/internal. Its source is bundled into the CLI during `pnpm build`, so `@iprep/modcs-server` does not need to exist on npm.

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- npm account with access to publish under `@iprep`
- Logged in to npm (`npm whoami`)

## Build

From the repo root:

```sh
pnpm install
pnpm build
```

The CLI bundle at `packages/cli/dist/index.js` includes the local server code.

## Dry Run

From the CLI package:

```sh
cd packages/cli
npm publish --dry-run --access public
```

Expected tarball contents:

```text
dist/index.js
dist/index.d.ts
package.json
README.md
```

Check that `package.json` does not contain `workspace:*` or `@iprep/modcs-server` in `dependencies`.

## Publish

```sh
cd packages/cli
npm publish --access public
```

Verify:

```sh
npm info @iprep/mdocs
npx @iprep/mdocs --help
```

## Troubleshooting

| Error | Fix |
|---|---|
| `402 Payment Required` | Use `--access public` for the scoped package. |
| `Unsupported URL Type "workspace:"` | Remove workspace protocol dependencies from the published package manifest. |
| Missing `modcs` command | Confirm `packages/cli/package.json` has `"bin": { "modcs": "dist/index.js" }`. |
| Type errors during build | Run `pnpm --filter @iprep/mdocs typecheck` and `pnpm --filter @iprep/modcs-server typecheck`. |
