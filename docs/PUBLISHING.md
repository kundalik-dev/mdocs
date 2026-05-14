# Publishing Guide

Packages published to npm:

| Package         | Path              |
| --------------- | ----------------- |
| `@iprep/modcs-server` | `packages/server` |
| `@iprep/mdocs` | `packages/cli`    |

**Order matters:** `@iprep/modcs-server` must be published before `@iprep/mdocs` because the CLI depends on it.

---

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- An npm account with access to publish `@iprep/mdocs` and `@iprep/modcs-server`
- Logged in to npm (`npm whoami` should return your username)

> **Package names:** The CLI now publishes as `@iprep/mdocs` and installs the `modcs` binary.

---

## Step 1 — Log in to npm

```sh
npm login
```

Verify you are logged in:

```sh
npm whoami
```

Check which packages you have access to (npm v9+):

```sh
npm access list packages
```

> **Note:** `npm access list packages @iprep` was removed in npm v9. Use the command above and look for `@iprep/*` entries. If the scope has never been published to, it won't appear yet — that's expected on a first publish.

---

## Step 2 — Install dependencies

From the repo root:

```sh
pnpm install
```

---

## Step 3 — Build both packages

From the repo root:

```sh
pnpm build
```

This runs `@iprep/modcs-server` build first, then `@iprep/mdocs`. Both output to their respective `dist/` folders with JS and `.d.ts` declaration files.

---

## Step 4 — Dry run (verify what will be published)

Run a dry run for each package to see exactly which files will be included in the tarball without actually publishing.

**`@iprep/modcs-server`:**

```sh
cd packages/server
pnpm publish --dry-run --access public
```

**`@iprep/mdocs`:**

```sh
cd packages/cli
pnpm publish --dry-run
```

### What to check in the dry-run output

- Only `dist/` files are listed — no `src/`, `tsup.config.ts`, or other dev files
- The version number is correct
- `@iprep/modcs-server`'s `workspace:*` dependency is replaced with the actual semver (e.g. `0.1.0`)

Expected `@iprep/modcs-server` tarball contents:

```
dist/index.js
dist/index.d.ts
package.json
README.md   ← optional but recommended
```

Expected `@iprep/mdocs` tarball contents:

```
dist/index.js
dist/index.d.ts
package.json
README.md   ← optional but recommended
```

---

## Step 5 — Publish `@iprep/modcs-server`

```sh
cd packages/server
pnpm publish --access public
```

Confirm the package is live:

```sh
npm info @iprep/modcs-server
```

---

## Step 6 — Publish `@iprep/mdocs`

```sh
cd packages/cli
pnpm publish
```

Confirm the package is live:

```sh
npm info @iprep/mdocs
```

---

## Step 7 — Verify the CLI works after install

Test a clean global install:

```sh
npm install -g @iprep/mdocs
modcs --version
modcs --help
```

Or test with `npx` without installing globally:

```sh
npx @iprep/mdocs --help
```

---

## Bumping versions for future releases

Use pnpm's built-in version commands from inside each package directory:

```sh
# patch: 0.1.0 → 0.1.1
pnpm version patch

# minor: 0.1.0 → 0.2.0
pnpm version minor

# major: 0.1.0 → 1.0.0
pnpm version major
```

Always bump `@iprep/modcs-server` first, then update `@iprep/mdocs`'s dependency version to match before bumping and publishing the CLI.

---

## Troubleshooting

| Error                      | Fix                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `403 Forbidden`            | You are not logged in or lack access to the `@iprep` scope — run `npm login`             |
| Cannot publish `@iprep/mdocs`     | Confirm your npm user has publish access to the `@iprep` scope |
| `402 Payment Required`     | The scope is private by default — pass `--access public`                                 |
| `workspace:*` not resolved | Use `pnpm publish` (not `npm publish`) — pnpm replaces workspace protocols automatically |
| Type errors during build   | Run `pnpm --filter @iprep/modcs-server typecheck` to find the offending file                   |
| `npm access list packages @iprep` errors | Command removed in npm v9 — use `npm access list packages` instead |
