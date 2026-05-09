import { resolve } from 'node:path';

/** Returns the resolved path only if it stays inside `base`. Returns null on traversal attempt. */
export function safeResolve(base: string, ...parts: string[]): string | null {
  const resolved = resolve(base, ...parts);
  return resolved.startsWith(base) ? resolved : null;
}
