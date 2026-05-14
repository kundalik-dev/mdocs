import { createServer } from "node:net";

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
