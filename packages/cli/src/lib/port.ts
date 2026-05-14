import { createServer } from "node:net";

/** Maximum number of ports to probe before giving up. */
const MAX_PORT_ATTEMPTS = 10;

/**
 * Checks whether a given host:port combination is available for listening.
 * Returns `true` if the port is free, `false` if it is already in use.
 */
export function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createServer();

    tester.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        // Unexpected error — treat as unavailable to be safe
        resolve(false);
      }
    });

    tester.once("listening", () => {
      // Port is free — close the tester and report available
      tester.close(() => resolve(true));
    });

    tester.listen(port, host);
  });
}

/**
 * Starting from `startPort`, finds the first available port on `host`.
 * Increments by 1 up to `MAX_PORT_ATTEMPTS` times.
 * Returns the free port number, or `null` if none found.
 */
export async function findAvailablePort(
  startPort: number,
  host: string,
): Promise<number | null> {
  for (let port = startPort; port < startPort + MAX_PORT_ATTEMPTS; port++) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
  }
  return null;
}
