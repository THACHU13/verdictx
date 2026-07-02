import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { findAvailablePort } from "./portFinder";

export interface RunnerResult {
  url: string;
  process: ChildProcess;
}

/**
 * Boots a static HTML project by running a dedicated, isolated HTTP file server.
 * Operates in a separate child process via `child_process.spawn()` to protect backend isolation.
 * 
 * @param projectPath Absolute path to the cloned static HTML repository root.
 * @param timeoutMs Boundary tolerance for booting up the service.
 */
export async function htmlRunner(projectPath: string, timeoutMs: number = 20000): Promise<RunnerResult> {
  const port = await findAvailablePort(8200, 9200);

  return new Promise((resolve, reject) => {
    let resolved = false;
    const staticServerScript = path.resolve(process.cwd(), "backend/execution/staticServer.ts");

    // Spawn the server process using 'npx tsx' for immediate compilation and execution of TypeScript
    const child = spawn("npx", ["tsx", staticServerScript, projectPath, port.toString()], {
      cwd: process.cwd(),
      env: { ...process.env, NODE_ENV: "development" },
      shell: true, // Shell required to guarantee execution of 'npx' across environments
    });

    let stderrBuffer = "";

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanupChildProcess(child);
        reject(new Error(`HTML Server failed to start within the ${timeoutMs}ms limit.`));
      }
    }, timeoutMs);

    child.stdout?.on("data", (chunk) => {
      const dataStr = chunk.toString();
      console.log(`[HTMLRunner Out] ${dataStr.trim()}`);

      // Wait until staticServer reports it is ready
      if (dataStr.includes("[StaticServer] Ready:") || dataStr.includes(`http://localhost:${port}`)) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutTimer);
          resolve({
            url: `http://localhost:${port}`,
            process: child,
          });
        }
      }
    });

    child.stderr?.on("data", (chunk) => {
      const dataStr = chunk.toString();
      stderrBuffer += dataStr;
      console.warn(`[HTMLRunner Err] ${dataStr.trim()}`);
    });

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        reject(new Error(`Execution Error: Failed to initiate static runner. Details: ${err.message}`));
      }
    });

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        reject(new Error(`Server closed prematurely with exit code: ${code}. Diagnostics: ${stderrBuffer}`));
      }
    });
  });
}

/**
 * Forcefully, gracefully terminates child process.
 */
function cleanupChildProcess(cp: ChildProcess) {
  try {
    cp.kill("SIGTERM");
  } catch (err) {
    console.error("[HTMLRunner Cleanup] Force kill error:", err);
  }
}
