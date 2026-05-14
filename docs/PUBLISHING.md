# Publishing Guide

Packages published to npm:

| Package         | Path              |
| --------------- | ----------------- |
| `@mdocs/server` | `packages/server` |
| `mdocs`         | `packages/cli`    |

**Order matters:** `@mdocs/server` must be published before `mdocs` because the CLI depends on it.

---

## Prerequisites

- Node.js >= 18
- pnpm >= 8
- An npm account with access to publish `mdocs` and `@mdocs/server`
- Logged in to npm (`npm whoami` should return your username)

> **Name availability:** As of May 14, 2026, the unscoped `mdocs` package name is held on npm by the deprecated-package placeholder at `mdocs@1.0.0`. Publishing this CLI as `mdocs` requires npm to grant you access to that package name first. Until then, use `npx @mdocs/cli` or `npx -p @mdocs/cli mdocs`.

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

This runs `@mdocs/server` build first, then `mdocs`. Both output to their respective `dist/` folders with JS and `.d.ts` declaration files.

---

## Step 4 — Dry run (verify what will be published)

Run a dry run for each package to see exactly which files will be included in the tarball without actually publishing.

**`@mdocs/server`:**

```sh
cd packages/server
pnpm publish --dry-run --access public
```

**`mdocs`:**

```sh
cd packages/cli
pnpm publish --dry-run
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

Expected `mdocs` tarball contents:

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

## Step 6 — Publish `mdocs`

```sh
cd packages/cli
pnpm publish
```

Confirm the package is live:

```sh
npm info mdocs
```

---

## Step 7 — Verify the CLI works after install

Test a clean global install:

```sh
npm install -g mdocs
mdocs --version
mdocs --help
```

Or test with `npx` without installing globally:

```sh
npx mdocs --help
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

Always bump `@mdocs/server` first, then update `mdocs`'s dependency version to match before bumping and publishing the CLI.

---

## Troubleshooting

| Error                      | Fix                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `403 Forbidden`            | You are not logged in or lack access to the `@mdocs` scope — run `npm login`             |
| Cannot publish `mdocs`     | The unscoped package name is currently held by npm's deprecated-package placeholder — request access from npm support |
| `402 Payment Required`     | The scope is private by default — pass `--access public`                                 |
| `workspace:*` not resolved | Use `pnpm publish` (not `npm publish`) — pnpm replaces workspace protocols automatically |
| Type errors during build   | Run `pnpm --filter @mdocs/server typecheck` to find the offending file                   |
| `npm access list packages @mdocs` errors | Command removed in npm v9 — use `npm access list packages` instead |
