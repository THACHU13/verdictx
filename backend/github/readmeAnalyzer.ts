import { promises as fs } from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { generateContentWithRetry } from "../utils/geminiHelper";

export interface ReadmeClaims {
  title: string;
  description: string;
  features: string[];
  techStack: string[];
  targetUsers: string[];
  claims: string[];
}

const readmeSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    description: { type: Type.STRING },
    features: { type: Type.ARRAY, items: { type: Type.STRING } },
    techStack: { type: Type.ARRAY, items: { type: Type.STRING } },
    targetUsers: { type: Type.ARRAY, items: { type: Type.STRING } },
    claims: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["title", "description", "features", "techStack", "targetUsers", "claims"]
};

/**
 * Searches for and parses README files to extract project expectations, specifications,
 * and tech claims using Gemini semantic modeling.
 * 
 * @param projectPath Absolute directory path of the project.
 */
export async function analyzeReadme(projectPath: string): Promise<ReadmeClaims> {
  const fallbackResult: ReadmeClaims = {
    title: "Unknown Project",
    description: "No README file found or failed to parse it. Operating under basic system parameters.",
    features: [],
    techStack: [],
    targetUsers: [],
    claims: []
  };

  try {
    // 1. Locate the README file
    const files = await fs.readdir(projectPath);
    const readmeFile = files.find(f => f.toLowerCase() === "readme.md");

    if (!readmeFile) {
      console.warn(`[ReadmeAnalyzer] No README.md found in ${projectPath}`);
      return fallbackResult;
    }

    const readmeContent = await fs.readFile(path.join(projectPath, readmeFile), "utf-8");

    if (!readmeContent.trim()) {
      return fallbackResult;
    }

    // 2. Initialize Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const prompt = `
      You are a technical document analyst for VerdictX.
      Read the following README.md file content and extract structured claims about the project.

      EXTRACT:
      1. Project Title
      2. High-level Description
      3. Claimed Features (List of clear functional capabilities)
      4. Tech Stack (Languages, libraries, databases)
      5. Target Users / Audience
      6. Core Claims (Concrete statements about speed, AI capabilities, offline support, databases, etc.)

      README CONTENT:
      """
      ${readmeContent.substring(0, 8000)}
      """
    `;

    const response = await generateContentWithRetry(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: readmeSchema
      }
    });

    if (response.text) {
      return JSON.parse(response.text.trim()) as ReadmeClaims;
    }

    return fallbackResult;
  } catch (error) {
    console.error("[ReadmeAnalyzer Error]", error);
    return fallbackResult;
  }
}
