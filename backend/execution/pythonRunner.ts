import { spawn, type ChildProcess } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import net from "net";
import { findAvailablePort } from "./portFinder";

export interface RunnerResult {
  url: string;
  process: ChildProcess;
}

/**
 * Checks if a port is listening on localhost.
 */
function isPortListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1", () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Executes a command inside the project directory.
 */
function runCommand(cmd: string, args: string[], cwd: string, env: any, timeoutMs: number = 60000): Promise<void> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const child = spawn(cmd, args, { cwd, env, shell: true });

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill("SIGKILL");
        } catch {}
        reject(new Error(`Command timed out: ${cmd} ${args.join(" ")}`));
      }
    }, timeoutMs);

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command exited with code ${code}: ${cmd} ${args.join(" ")}`));
        }
      }
    });
  });
}

/**
 * Searches for all Python files recursively to extract entry files and keywords.
 */
async function findPythonFiles(dir: string, maxDepth: number = 4, currentDepth: number = 1): Promise<{ path: string; content: string }[]> {
  const results: { path: string; content: string }[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === ".venv" || entry.name === "venv" || entry.name === "node_modules" || entry.name === ".git") {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith(".py")) {
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          results.push({ path: fullPath, content });
        } catch {}
      } else if (entry.isDirectory() && currentDepth < maxDepth) {
        const subResults = await findPythonFiles(fullPath, maxDepth, currentDepth + 1);
        results.push(...subResults);
      }
    }
  } catch {}
  return results;
}

/**
 * Automatically creates a Python virtual environment, installs dependencies,
 * determines startup commands, and boots Flask, FastAPI, Django, or Streamlit servers.
 */
export async function pythonRunner(
  projectPath: string,
  projectType: "flask" | "fastapi" | "django" | "streamlit",
  installTimeoutMs: number = 120000,
  startTimeoutMs: number = 45000
): Promise<RunnerResult> {
  console.log(`[PythonRunner] Setting up python virtual environment for project type [${projectType}] at: ${projectPath}`);

  // Step 1: Create Virtual Environment
  // Try 'python3' as default, fallback to 'python'
  let pythonCmd = "python3";
  try {
    await runCommand("python3", ["--version"], projectPath, process.env, 10000);
  } catch {
    pythonCmd = "python";
  }

  console.log(`[PythonRunner] Using python executable: ${pythonCmd}`);
  await runCommand(pythonCmd, ["-m", "venv", ".venv"], projectPath, process.env, 45000);
  console.log("[PythonRunner] Virtual environment created successfully.");

  const venvBinDir = path.join(projectPath, ".venv", "bin");
  const pipPath = path.join(venvBinDir, "pip");
  const localPythonPath = path.join(venvBinDir, "python");

  // Custom environment combining system and venv bin path
  const customEnv = {
    ...process.env,
    PATH: `${venvBinDir}:${process.env.PATH || ""}`,
    VIRTUAL_ENV: path.join(projectPath, ".venv"),
    PYTHONUNBUFFERED: "1",
  };

  // Step 2: Upgrade Pip
  console.log("[PythonRunner] Upgrading pip...");
  await runCommand(pipPath, ["install", "--upgrade", "pip"], projectPath, customEnv, 30000);

  // Step 3: Install dependencies
  const entries = await fs.readdir(projectPath);
  const hasRequirements = entries.includes("requirements.txt");
  const hasPyProject = entries.includes("pyproject.toml");
  const hasPipfile = entries.includes("Pipfile");

  if (hasRequirements) {
    console.log("[PythonRunner] Installing from requirements.txt...");
    await runCommand(pipPath, ["install", "-r", "requirements.txt"], projectPath, customEnv, installTimeoutMs);
  } else if (hasPipfile) {
    console.log("[PythonRunner] Installing pipenv and dependencies from Pipfile...");
    await runCommand(pipPath, ["install", "pipenv"], projectPath, customEnv, 45000);
    await runCommand("pipenv", ["install", "--system"], projectPath, customEnv, installTimeoutMs);
  } else if (hasPyProject) {
    console.log("[PythonRunner] Installing from pyproject.toml...");
    let pyprojContent = "";
    try {
      pyprojContent = await fs.readFile(path.join(projectPath, "pyproject.toml"), "utf-8");
    } catch {}

    if (pyprojContent.includes("poetry")) {
      await runCommand(pipPath, ["install", "poetry"], projectPath, customEnv, 45000);
      await runCommand("poetry", ["install", "--no-root"], projectPath, customEnv, installTimeoutMs);
    } else {
      await runCommand(pipPath, ["install", "."], projectPath, customEnv, installTimeoutMs);
    }
  }

  // Ensure framework dependency is installed (fallback safeguard)
  console.log(`[PythonRunner] Checking/Installing target framework dependency: ${projectType}`);
  if (projectType === "flask") {
    await runCommand(pipPath, ["install", "flask"], projectPath, customEnv, 30000);
  } else if (projectType === "fastapi") {
    await runCommand(pipPath, ["install", "fastapi", "uvicorn"], projectPath, customEnv, 30000);
  } else if (projectType === "django") {
    await runCommand(pipPath, ["install", "django"], projectPath, customEnv, 30000);
  } else if (projectType === "streamlit") {
    await runCommand(pipPath, ["install", "streamlit"], projectPath, customEnv, 45000);
  }

  // Step 4: Run migrations for Django
  if (projectType === "django") {
    console.log("[PythonRunner] Running Django database migrations...");
    try {
      await runCommand(localPythonPath, ["manage.py", "migrate"], projectPath, customEnv, 30000);
    } catch (migrateErr) {
      console.warn("[PythonRunner] Django migration warning (ignoring to proceed to startup):", migrateErr);
    }
  }

  // Step 5: Secure available port
  const port = await findAvailablePort(8400, 9400);

  // Step 6: Identify startup command parameters
  let startCmd = "";
  let startArgs: string[] = [];
  const pyFiles = await findPythonFiles(projectPath);

  if (projectType === "django") {
    // Django manage.py is run directly
    startCmd = localPythonPath;
    startArgs = ["manage.py", "runserver", `127.0.0.1:${port}`, "--noreload"];
  } else if (projectType === "streamlit") {
    // Find the main app file for Streamlit
    let mainFile = "app.py";
    const possibleStreamlitFile = pyFiles.find(
      (f) =>
        f.path.endsWith("streamlit_app.py") ||
        f.path.endsWith("main.py") ||
        f.path.endsWith("app.py") ||
        f.content.includes("import streamlit")
    );
    if (possibleStreamlitFile) {
      mainFile = path.relative(projectPath, possibleStreamlitFile.path);
    }
    startCmd = path.join(venvBinDir, "streamlit");
    startArgs = ["run", mainFile, `--server.port=${port}`, "--server.address=127.0.0.1", "--server.headless=true"];
  } else if (projectType === "fastapi") {
    // Scan for FastAPI instance variable name and module path
    let modulePath = "main";
    let appVarName = "app";

    const fastapiFile = pyFiles.find((f) => f.content.includes("FastAPI("));
    if (fastapiFile) {
      const relPath = path.relative(projectPath, fastapiFile.path);
      modulePath = relPath.slice(0, -3).replace(/\//g, "."); // convert slashes to dots, drop .py
      
      const appVarMatch = fastapiFile.content.match(/^([a-zA-Z0-9_]+)\s*=\s*FastAPI\(/m);
      if (appVarMatch && appVarMatch[1]) {
        appVarName = appVarMatch[1];
      }
    }

    startCmd = path.join(venvBinDir, "uvicorn");
    startArgs = [`${modulePath}:${appVarName}`, "--host", "127.0.0.1", "--port", port.toString(), "--workers", "1"];
  } else if (projectType === "flask") {
    // Scan for Flask instance
    let appFile = "app.py";
    const flaskFile = pyFiles.find((f) => f.content.includes("Flask("));
    if (flaskFile) {
      appFile = path.relative(projectPath, flaskFile.path);
    }
    
    startCmd = path.join(venvBinDir, "flask");
    startArgs = ["run", "--host=127.0.0.1", `--port=${port}`];
    customEnv["FLASK_APP"] = appFile;
    customEnv["FLASK_ENV"] = "development";
  }

  // Step 7: Spawn Server Process
  console.log(`[PythonRunner] Spawning server process: ${startCmd} ${startArgs.join(" ")}`);
  
  return new Promise((resolve, reject) => {
    let resolved = false;

    const child = spawn(startCmd, startArgs, {
      cwd: projectPath,
      env: customEnv,
      shell: true,
    });

    let stdoutAccumulator = "";
    let stderrAccumulator = "";

    // Timer fallback
    const timeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(probeInterval);
        cleanupProcess(child);
        reject(new Error(`Python [${projectType}] server failed to start on port ${port} within ${startTimeoutMs}ms.`));
      }
    }, startTimeoutMs);

    // Active HTTP/TCP probing loop (polls every 500ms)
    const probeInterval = setInterval(async () => {
      if (resolved) {
        clearInterval(probeInterval);
        return;
      }
      const active = await isPortListening(port);
      if (active) {
        if (!resolved) {
          resolved = true;
          clearInterval(probeInterval);
          clearTimeout(timeoutTimer);
          console.log(`[PythonRunner] Live verification: verified port ${port} is listening via TCP.`);
          resolve({
            url: `http://localhost:${port}`,
            process: child,
          });
        }
      }
    }, 500);

    // Standard outputs capturing for detailed logging
    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      stdoutAccumulator += text;
      console.log(`[PythonRunner Out] ${text.trim()}`);
    });

    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      stderrAccumulator += text;
      console.warn(`[PythonRunner Err] ${text.trim()}`);
    });

    child.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        clearInterval(probeInterval);
        clearTimeout(timeoutTimer);
        reject(new Error(`Failed to initiate python child process: ${err.message}`));
      }
    });

    child.on("close", (code) => {
      if (!resolved) {
        resolved = true;
        clearInterval(probeInterval);
        clearTimeout(timeoutTimer);
        reject(new Error(`Python process closed prematurely with code ${code}. Diagnostics: ${stderrAccumulator || stdoutAccumulator}`));
      }
    });
  });
}

function cleanupProcess(cp: ChildProcess) {
  try {
    cp.kill("SIGTERM");
  } catch (err) {
    console.error("[PythonRunner Cleanup] Terminate process error:", err);
  }
}
