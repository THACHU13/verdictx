import { spawn, type ChildProcess } from "child_process";
import path from "path";
import { findAvailablePort } from "./portFinder";

export interface RunnerResult {
  url: string;
  process: ChildProcess;
}

/**
 * Resolves standard npm dependency installations for Vite projects and boots
 * the local dev server using isolated child processes.
 * 
 * @param projectPath Absolute path to the Vite project root.
 * @param installTimeoutMs Boundary tolerance for downloading node_modules. Standard offline switches applied.
 * @param startTimeoutMs Boundary tolerance for launching dev server and capturing its bound port.
 */
export async function viteRunner(
  projectPath: string,
  installTimeoutMs: number = 180000,
  startTimeoutMs: number = 45000
): Promise<RunnerResult> {
  
  // Step 1: Install project dependencies dynamically
  console.log(`[ViteRunner] Initiating npm install under path: ${projectPath}`);
  await runNpmInstall(projectPath, installTimeoutMs);
  console.log("[ViteRunner] npm install succeeded.");

  // Step 2: Dynamically secure an available network port
  const port = await findAvailablePort(8300, 9300);

  // Step 3: Run the Vite project using child_process.spawn
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Use spawn to launch 'npm run dev' and forward the chosen port parameter
    // Fall back safety included -- --port acts as standard forward for vite CLI
    const child = spawn("npm", ["run", "dev", "--", `--port=${port}`, "--host=0.0.0.0"], {
      cwd: projectPath,
      env: { ...process.env, NODE_ENV: "development", PORT: port.toString() },
      shell: true,
    });

    let stdoutAccumulator = "";
    let stderrAccumulator = "";

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanupChildProcess(child);
        reject(new Error(`Vite Dev Server timed out waiting for local address log within ${startTimeoutMs}ms.`));
      }
    }, startTimeoutMs);

    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutAccumulator += text;
      console.log(`[ViteRunner Out] ${text.trim()}`);

      // Vite prints variations of: Local: http://localhost:5173/ or Local: http://127.0.0.1:5173/
      // Matches on the specific allocated port we requested
      const localUrlRegex = new RegExp(`(http:\\/\\/(localhost|127\\.0\\.0\\.1|0\\.0\\.0\\.0):${port})`, "i");
      const match = stdoutAccumulator.match(localUrlRegex);

      if (match || (stdoutAccumulator.includes("Local:") && stdoutAccumulator.includes(port.toString()))) {
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
      const text = chunk.toString();
      stderrAccumulator += text;
      console.warn(`[ViteRunner Err] ${text.trim()}`);
    });

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        reject(new Error(`Execution Error: Failed to spawn Vite dev server: ${err.message}`));
      }
    });

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        reject(new Error(`Vite server closed with code ${code}. Diagnostics: ${stderrAccumulator}`));
      }
    });
  });
}

/**
 * Isolated runner that installs project dependencies before launching.
 */
function runNpmInstall(cwd: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Speeds up installation by bypassing security audits and funding alerts, prioritizing local cache
    const child = spawn("npm", ["install", "--no-audit", "--no-fund", "--prefer-offline"], {
      cwd,
      shell: true,
    });

    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill("SIGKILL");
        } catch {}
        reject(new Error(`Dependency installation timed out after ${timeoutMs}ms.`));
      }
    }, timeoutMs);

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        reject(new Error(`Dependency installation process failed to initiate: ${err.message}`));
      }
    });

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutTimer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Npm install failed with termination code ${code}.`));
        }
      }
    });
  });
}

/**
 * Gracefully terminates process.
 */
function cleanupChildProcess(cp: ChildProcess) {
  try {
    cp.kill("SIGTERM");
  } catch (err) {
    console.error("[ViteRunner Cleanup] Termination error:", err);
  }
}
