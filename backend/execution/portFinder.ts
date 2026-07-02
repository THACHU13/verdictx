import net from "net";

/**
 * Probes the local interface to find an unused network port starting from a baseline.
 * Prevents race conditions and port collision in multi-analysis settings.
 * 
 * @param startPort Initial port to probe.
 * @param endPort Ultimate boundary of probe range.
 */
export function findAvailablePort(startPort: number = 8100, endPort: number = 9100): Promise<number> {
  return new Promise((resolve, reject) => {
    let currentPort = startPort;

    function attemptProbe() {
      const server = net.createServer();
      server.unref();

      server.on("error", () => {
        currentPort++;
        if (currentPort > endPort) {
          reject(new Error(`Failed to allocate free port. Traversed range: ${startPort} - ${endPort}`));
        } else {
          attemptProbe();
        }
      });

      server.on("listening", () => {
        server.close(() => {
          resolve(currentPort);
        });
      });

      server.listen(currentPort, "0.0.0.0");
    }

    attemptProbe();
  });
}
