# Publishing Guide

Packages published to npm under the `@mdocs` scope:

| Package         | Path              |
| --------------- | ----------------- |
| `@mdocs/server` | `packages/server` |
| `@mdocs/cli`    | `packages/cli`    |

**Order matters:** `@mdocs/server` must be published before `@mdocs/cli` because the CLI depends on it.

---

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- An npm account with access to the `@mdocs` scope
- Logged in to npm (`npm whoami` should return your username)

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

> **Note:** `npm access list packages @mdocs` was removed in npm v9. Use the command above and look for `@mdocs/*` entries. If the scope has never been published to, it won't appear yet — that's expected on a first publish.

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

This runs `@mdocs/server` build first, then `@mdocs/cli`. Both output to their respective `dist/` folders with JS and `.d.ts` declaration files.

---

## Step 4 — Dry run (verify what will be published)

Run a dry run for each package to see exactly which files will be included in the tarball without actually publishing.

**`@mdocs/server`:**

```sh
cd packages/server
pnpm publish --dry-run --access public
```

**`@mdocs/cli`:**

```sh
cd packages/cli
pnpm publish --dry-run --access public
```

### What to check in the dry-run output

- Only `dist/` files are listed — no `src/`, `tsup.config.ts`, or other dev files
- The version number is correct
- `@mdocs/server`'s `workspace:*` dependency is replaced with the actual semver (e.g. `0.1.0`)

Expected `@mdocs/server` tarball contents:

```
dist/index.js
dist/index.d.ts
package.json
README.md   ← optional but recommended
```

Expected `@mdocs/cli` tarball contents:

```
dist/index.js
dist/index.d.ts
package.json
README.md   ← optional but recommended
```

---

## Step 5 — Publish `@mdocs/server`

```sh
cd packages/server
pnpm publish --access public
```

Confirm the package is live:

```sh
npm info @mdocs/server
```

---

## Step 6 — Publish `@mdocs/cli`

```sh
cd packages/cli
pnpm publish --access public
```

Confirm the package is live:

```sh
npm info @mdocs/cli
```

---

## Step 7 — Verify the CLI works after install

Test a clean global install:

```sh
npm install -g @mdocs/cli
mdocs --version
mdocs --help
```

Or test with `npx` without installing globally:

```sh
npx @mdocs/cli --help
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

Always bump `@mdocs/server` first, then update `@mdocs/cli`'s dependency version to match before bumping and publishing the CLI.

---

## Troubleshooting

| Error                      | Fix                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `403 Forbidden`            | You are not logged in or lack access to the `@mdocs` scope — run `npm login`             |
| `402 Payment Required`     | The scope is private by default — pass `--access public`                                 |
| `workspace:*` not resolved | Use `pnpm publish` (not `npm publish`) — pnpm replaces workspace protocols automatically |
| Type errors during build   | Run `pnpm --filter @mdocs/server typecheck` to find the offending file                   |
| `npm access list packages @mdocs` errors | Command removed in npm v9 — use `npm access list packages` instead |
