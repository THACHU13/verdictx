import simpleGit from "simple-git";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

// Root directory for temporary repository clones
const CLONES_DIR = path.resolve(process.cwd(), "temp-clones");

/**
 * Validates whether a string is a valid GitHub or Git repository URL.
 * Supports standard HTTPS and SSH formats.
 */
export function isValidGitUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  
  // Clean string
  const cleanUrl = url.trim();
  
  // Basic Regex checks for Git HTTPS/SSH URLs
  const httpsGitRegex = /^https?:\/\/(www\.)?(github|gitlab|bitbucket)\.com\/[\w.-]+\/[\w.-]+(\.git)?\/?$/i;
  const sshGitRegex = /^git@[\w.-]+:[\w.-]+\/[\w.-]+(\.git)?$/i;
  
  return httpsGitRegex.test(cleanUrl) || sshGitRegex.test(cleanUrl);
}

/**
 * Extract repository name from its Git URL.
 * Example: https://github.com/facebook/react.git -> react
 */
export function extractRepoName(url: string): string {
  try {
    const cleanUrl = url.trim().replace(/\/$/, "");
    const parts = cleanUrl.split("/");
    const lastPart = parts[parts.length - 1];
    return lastPart.replace(/\.git$/i, "") || "unknown-repo";
  } catch {
    return "repo";
  }
}

/**
 * Clones a Git repository to a unique, temporary directory.
 * Includes performance optimizations (shallow clone) and safety guards.
 * 
 * @param repoUrl The Git/GitHub URL to clone.
 * @returns The absolute local directory path where the repository was cloned.
 */
export async function cloneRepo(repoUrl: string): Promise<string> {
  if (!isValidGitUrl(repoUrl)) {
    throw new Error(`Invalid repository URL: "${repoUrl}". Please provide a valid GitHub, GitLab, or Bitbucket HTTPS or SSH URL.`);
  }

  const cleanUrl = repoUrl.trim();
  const repoName = extractRepoName(cleanUrl);
  
  // Create a highly unique folder name using repository name, timestamp, and random suffix
  const uniqueId = crypto.randomBytes(4).toString("hex");
  const timestamp = Date.now();
  const folderName = `${repoName}-${timestamp}-${uniqueId}`;
  const targetPath = path.join(CLONES_DIR, folderName);

  try {
    // Ensure the root clones directory exists
    await fs.mkdir(CLONES_DIR, { recursive: true });

    const git = simpleGit();
    
    // Core performance optimization: --depth 1 (shallow clone)
    // Avoids downloading deep system history, making cloning near-instantaneous.
    await git.clone(cleanUrl, targetPath, [
      "--depth", "1",
      "--no-single-branch" // gets the default branch easily
    ]);

    // Verify clone succeeded by checking directory existence
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      throw new Error(`Cloned target is not a directory.`);
    }

    return targetPath;
  } catch (error: any) {
    // Clean up directory if it was partially created
    try {
      await fs.rm(targetPath, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.error(`[Cleanup Error] Failed to clean up incomplete clone at ${targetPath}:`, cleanupErr);
    }

    throw new Error(`Repository cloning failed. Details: ${error?.message || error}`);
  }
}
