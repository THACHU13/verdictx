import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { isValidGitUrl, extractRepoName } from "./cloneRepo";
import { detectProject, type ProjectType } from "./detectProject";
import { htmlRunner } from "../execution/htmlRunner";
import { puppeteerCapture } from "../screenshot/puppeteerCapture";

// Colored logs helper
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m"
};

/**
 * Asserts that two values are strictly equal.
 */
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion Failed: ${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

/**
 * Asserts that a value is truthy.
 */
function assertTruthy(actual: any, message: string): void {
  if (!actual) {
    throw new Error(`Assertion Failed: ${message}\nExpected truthy value, but received: ${actual}`);
  }
}

/**
 * Asserts that a promise throws an error.
 */
async function assertThrows(fn: () => Promise<any>, message: string): Promise<void> {
  try {
    await fn();
    throw new Error(`Assertion Failed: Expected function to throw, but it succeeded: ${message}`);
  } catch (error: any) {
    if (error.message.includes("Assertion Failed:")) {
      throw error;
    }
    // Expected to throw, test passes
  }
}

/**
 * Main test runner.
 */
export async function runTests() {
  console.log(`\n${colors.cyan}====================================================`);
  console.log(`Starting VerdictX Backend Module 1 to 4 Test Suite...`);
  console.log(`====================================================${colors.reset}\n`);

  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`  ${colors.green}✓ PASS:${colors.reset} ${name}`);
      passed++;
    } catch (error: any) {
      console.error(`  ${colors.red}✗ FAIL:${colors.reset} ${name}`);
      console.error(`     ${colors.red}${error.stack || error.message || error}${colors.reset}\n`);
      failed++;
    }
  };

  // --- Test 1: URL Validation ---
  await test("isValidGitUrl - correctly identifies valid and invalid URLs", async () => {
    // Valid HTTPS URLs
    assertEqual(isValidGitUrl("https://github.com/facebook/react"), true, "Valid GitHub URL");
    assertEqual(isValidGitUrl("http://github.com/vuejs/core.git"), true, "Valid Vue URL with .git");
    assertEqual(isValidGitUrl("https://gitlab.com/someuser/gitlab-project"), true, "Valid GitLab URL");
    
    // Valid SSH URLs
    assertEqual(isValidGitUrl("git@github.com:facebook/react.git"), true, "Valid SSH URL");

    // Invalid URLs
    assertEqual(isValidGitUrl("https://github.com/"), false, "Empty path on GitHub");
    assertEqual(isValidGitUrl("not-a-url"), false, "Plain text string");
    assertEqual(isValidGitUrl("https://google.com"), false, "Non-code host");
    assertEqual(isValidGitUrl(""), false, "Empty string");
  });

  // --- Test 2: Extraction of Repository Name ---
  await test("extractRepoName - extracts valid names from Git URLs", async () => {
    assertEqual(extractRepoName("https://github.com/facebook/react"), "react", "Standard React HTTPS URL");
    assertEqual(extractRepoName("https://github.com/vuejs/core.git"), "core", "Vue URL with .git suffix");
    assertEqual(extractRepoName("git@github.com:angular/angular.git"), "angular", "SSH Angular URL");
    assertEqual(extractRepoName("https://github.com/someone/trailing-slash/"), "trailing-slash", "URL with trailing slash");
  });

  // --- Test 3: Static HTML Detection ---
  await test("detectProject - correctly identifies Static HTML projects", async () => {
    const tempDir = path.join(process.cwd(), `temp-test-${crypto.randomBytes(4).toString("hex")}`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      
      // Create root index.html
      await fs.writeFile(path.join(tempDir, "index.html"), "<!DOCTYPE html><html><body><h1>Hello Test</h1></body></html>");
      
      const result = await detectProject(tempDir);
      assertEqual(result.projectType, "html" as ProjectType, "Should resolve to static HTML");
      assertEqual(result.hasIndexHtml, true, "Should have index.html flags");
      assertEqual(result.hasPackageJson, false, "Should not have package.json flags");
    } finally {
      // Clean up temp test directory
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  // --- Test 4: React Vite Project Detection ---
  await test("detectProject - correctly identifies React Vite projects", async () => {
    const tempDir = path.join(process.cwd(), `temp-test-${crypto.randomBytes(4).toString("hex")}`);
    
    try {
      await fs.mkdir(tempDir, { recursive: true });
      
      // Create package.json with vite dependency
      const packageJson = {
        name: "test-react-app",
        dependencies: {
          "react": "^18.0.0",
        },
        devDependencies: {
          "vite": "^5.0.0"
        }
      };
      await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify(packageJson, null, 2));
      await fs.writeFile(path.join(tempDir, "index.html"), "<!DOCTYPE html><html></html>");

      const result = await detectProject(tempDir);
      assertEqual(result.projectType, "vite" as ProjectType, "Should resolve to React/Vite");
      assertEqual(result.hasIndexHtml, true, "Should detect index.html");
      assertEqual(result.hasPackageJson, true, "Should detect package.json");
      assertEqual(result.projectName, "test-react-app", "Should extract package name correctly");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  // --- Test 5: HTML Runner execution and URL generation ---
  await test("htmlRunner - provisions working background static host", async () => {
    const tempDir = path.join(process.cwd(), `temp-test-${crypto.randomBytes(4).toString("hex")}`);
    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(
        path.join(tempDir, "index.html"),
        "<!DOCTYPE html><html><head><title>VerdictX Test Site</title></head><body><h1>Working!</h1></body></html>"
      );

      // Deploy background static server via htmlRunner
      const runInfo = await htmlRunner(tempDir, 15000);
      assertTruthy(runInfo.url.startsWith("http://localhost:"), "Host URL must match expected pattern");
      assertTruthy(runInfo.process, "Must keep process reference for subsequent cleanup");

      // Terminate running process cleanly
      runInfo.process.kill("SIGTERM");
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  // --- Test 6: Puppeteer capture functionality ---
  await test("puppeteerCapture - launches headless instances and captures snapshots", async () => {
    const tempDir = path.join(process.cwd(), `temp-test-${crypto.randomBytes(4).toString("hex")}`);
    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(
        path.join(tempDir, "index.html"),
        "<!DOCTYPE html><html><head><title>VerdictX Automated Screenshot Page</title></head><body><h1>Success Screen</h1></body></html>"
      );

      // 1. Launch HTML Runner
      const runInfo = await htmlRunner(tempDir, 15000);
      
      // 2. Perform mock screenshot grab
      const screenResult = await puppeteerCapture(runInfo.url, 20000);
      
      assertEqual(screenResult.metadata.title, "VerdictX Automated Screenshot Page", "Metadata must extract document title");
      assertTruthy(screenResult.homepageScreenshot.endsWith(".png"), "Home grab file path matches pattern");
      assertTruthy(screenResult.fullPageScreenshot.endsWith(".png"), "Full grab file path matches pattern");

      // Clean up server
      runInfo.process.kill("SIGTERM");

      // Clean up generated screenshot files if possible
      const capturesPath = path.resolve(process.cwd(), "public");
      await fs.rm(path.join(capturesPath, screenResult.homepageScreenshot), { force: true });
      await fs.rm(path.join(capturesPath, screenResult.fullPageScreenshot), { force: true });
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  console.log(`\n${colors.cyan}----------------------------------------------------`);
  console.log(`Test Execution Finished.`);
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  console.log(`====================================================${colors.reset}\n`);

  if (failed > 0) {
    throw new Error(`Test suite failed with ${failed} failure(s).`);
  }
}

// Auto-run if executed directly as a script
if (process.argv[1]?.endsWith("tests.ts") || process.argv[1]?.endsWith("tests.js")) {
  runTests().catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
