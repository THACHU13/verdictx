import { promises as fs } from "fs";
import path from "path";

export type ProjectType = "html" | "vite" | "flask" | "fastapi" | "django" | "streamlit" | "unsupported";

export interface ProjectDetectionResult {
  projectType: ProjectType;
  hasPackageJson: boolean;
  hasIndexHtml: boolean;
  projectName?: string;
}

/**
 * Recursively scans directory to find files or analyze contents
 */
async function findFilesRecursively(dir: string, maxDepth: number = 3, currentDepth: number = 1): Promise<string[]> {
  const found: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip node_modules, virtual envs, git
      if (entry.name === "node_modules" || entry.name === ".venv" || entry.name === "venv" || entry.name === ".git") {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile()) {
        found.push(fullPath);
      } else if (entry.isDirectory() && currentDepth < maxDepth) {
        const subFiles = await findFilesRecursively(fullPath, maxDepth, currentDepth + 1);
        found.push(...subFiles);
      }
    }
  } catch (err) {
    console.warn(`[Project Detection] Recursive scan warning in ${dir}:`, err);
  }
  return found;
}

/**
 * Detects the software project type of a given local directory.
 * Rules:
 * - HTML: 'index.html' exists in the root
 * - React Vite: 'package.json' exists AND has "vite" in dependencies or devDependencies
 * - Python Flask / FastAPI / Django / Streamlit: requirements.txt, pyproject.toml, Pipfile, setup.py, manage.py or .py files exist, with framework-specific markers.
 * - Otherwise: 'unsupported'
 * 
 * @param localPath Absolute path to the cloned repository folder.
 */
export async function detectProject(localPath: string): Promise<ProjectDetectionResult> {
  const result: ProjectDetectionResult = {
    projectType: "unsupported",
    hasPackageJson: false,
    hasIndexHtml: false,
  };

  try {
    // 1. Check for index.html in the root
    const indexPath = path.join(localPath, "index.html");
    try {
      const stats = await fs.stat(indexPath);
      if (stats.isFile()) {
        result.hasIndexHtml = true;
      }
    } catch {
      // index.html does not exist in root
    }

    // 2. Check for package.json in the root
    const packageJsonPath = path.join(localPath, "package.json");
    try {
      const stats = await fs.stat(packageJsonPath);
      if (stats.isFile()) {
        result.hasPackageJson = true;

        // Try reading and parsing package.json
        const content = await fs.readFile(packageJsonPath, "utf-8");
        const packageData = JSON.parse(content);

        // Keep name for project reference if present
        if (packageData.name) {
          result.projectName = packageData.name;
        }

        // Verify if vite is listed as a dependency or devDependency
        const deps = packageData.dependencies || {};
        const devDeps = packageData.devDependencies || {};

        const hasVite = "vite" in deps || "vite" in devDeps;

        if (hasVite) {
          result.projectType = "vite";
          return result;
        }
      }
    } catch (parseError) {
      // package.json missing or invalid JSON
      console.warn(`[Project Detection] Invalid or unreadable package.json at ${localPath}:`, parseError);
    }

    // 3. Python Detection & Multi-Framework support
    // Find all potential files in the repo
    const allFiles = await findFilesRecursively(localPath, 3);
    const relativeFiles = allFiles.map(f => path.relative(localPath, f));

    const pyFiles = relativeFiles.filter(f => f.endsWith(".py"));
    const hasPythonFiles = pyFiles.length > 0;
    const hasRequirements = relativeFiles.some(f => f === "requirements.txt");
    const hasPyProject = relativeFiles.some(f => f === "pyproject.toml");
    const hasPipfile = relativeFiles.some(f => f === "Pipfile");
    const hasSetupPy = relativeFiles.some(f => f === "setup.py");
    const hasManagePy = relativeFiles.some(f => f.endsWith("manage.py"));

    if (hasPythonFiles || hasRequirements || hasPyProject || hasPipfile || hasSetupPy || hasManagePy) {
      console.log(`[Project Detection] Python files/config detected in ${localPath}. Parsing framework...`);
      
      // Let's inspect dependencies and code files to identify framework
      let reqContent = "";
      let pyprojContent = "";
      let pipfileContent = "";

      if (hasRequirements) {
        try {
          reqContent = await fs.readFile(path.join(localPath, "requirements.txt"), "utf-8");
        } catch {}
      }
      if (hasPyProject) {
        try {
          pyprojContent = await fs.readFile(path.join(localPath, "pyproject.toml"), "utf-8");
        } catch {}
      }
      if (hasPipfile) {
        try {
          pipfileContent = await fs.readFile(path.join(localPath, "Pipfile"), "utf-8");
        } catch {}
      }

      const allDependencyContent = (reqContent + "\n" + pyprojContent + "\n" + pipfileContent).toLowerCase();

      // Check for specific frameworks
      // A. Django
      if (hasManagePy || allDependencyContent.includes("django")) {
        result.projectType = "django";
        return result;
      }

      // B. Streamlit
      if (allDependencyContent.includes("streamlit")) {
        result.projectType = "streamlit";
        return result;
      }

      // C. FastAPI
      if (allDependencyContent.includes("fastapi")) {
        result.projectType = "fastapi";
        return result;
      }

      // D. Flask
      if (allDependencyContent.includes("flask")) {
        result.projectType = "flask";
        return result;
      }

      // Fallback: If there are .py files, read some imports to see if we can find any of the frameworks
      for (const pyFile of pyFiles.slice(0, 10)) { // Inspect up to 10 python files
        try {
          const fileContent = await fs.readFile(path.join(localPath, pyFile), "utf-8");
          if (fileContent.includes("import streamlit") || fileContent.includes("from streamlit")) {
            result.projectType = "streamlit";
            return result;
          }
          if (fileContent.includes("import fastapi") || fileContent.includes("from fastapi") || fileContent.includes("FastAPI(")) {
            result.projectType = "fastapi";
            return result;
          }
          if (fileContent.includes("import flask") || fileContent.includes("from flask") || fileContent.includes("Flask(")) {
            result.projectType = "flask";
            return result;
          }
          if (fileContent.includes("import django") || fileContent.includes("from django")) {
            result.projectType = "django";
            return result;
          }
        } catch {}
      }

      // Default python classification if none matched
      if (hasManagePy) {
        result.projectType = "django";
        return result;
      }
      
      // If we see any app.py / main.py / streamlit_app.py let's guess by filename
      if (pyFiles.some(f => f.endsWith("streamlit_app.py"))) {
        result.projectType = "streamlit";
        return result;
      }

      // Otherwise we default to flask or fastapi if requirements exist or first python file
      // Let's default to flask if we have to make a choice, or unsupported.
      // Wait, let's default to "flask" as a generic python app runner.
      result.projectType = "flask";
      return result;
    }

    // 4. Fallback to static HTML if index.html exists but it is not a Vite React app or Python app
    if (result.hasIndexHtml) {
      result.projectType = "html";
    }

    return result;
  } catch (error) {
    console.error(`[Project Detection Error] Error detecting project at ${localPath}:`, error);
    return result;
  }
}
