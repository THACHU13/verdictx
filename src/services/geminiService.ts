/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";

export interface ProjectAnalysis {
  ideaAnalysis: {
    clarityScore: number;
    uniquenessScore: number;
    usefulnessScore: number;
    strengths: string[];
    weaknesses: string[];
    insight: string;
    score: number;
  };
  developerPerspective: {
    feasibilityScore: number;
    strengths: string[];
    challenges: string[];
    technicalRisks: string[];
    insight: string;
    stackRecommendation: string[];
    complexity: string;
    score: number;
  };
  businessPerspective: {
    marketScore: number;
    opportunities: string[];
    weaknesses: string[];
    risks: string[];
    insight: string;
    monetization: string;
    competitors: string[];
    scalability: string;
    score: number;
  };
  socialImpact: {
    impactScore: number;
    positiveImpact: string[];
    concerns: string[];
    ethicalRisks: string[];
    insight: string;
    benefit: string;
    ethicalConsiderations: string[];
    score: number;
  };
  risks: {
    safetyScore: number;
    majorRisks: string[];
    failureScenarios: string[];
    mitigation: string[];
    insight: string;
    score: number;
  };
  codeQuality: {
    qualityScore: number;
    strengths: string[];
    weaknesses: string[];
    missingElements: string[];
    insight: string;
    score: number;
  };
  ideaVsExecution: {
    matchScore: number;
    matches: string[];
    missing: string[];
    engineeringCheck: string[];
    insight: string;
    score: number;
  };
  finalVerdict: {
    overallScore: number;
    decision: "CONTINUE" | "IMPROVE" | "PIVOT";
    strengths: string[];
    weaknesses: string[];
    insights: string[];
    reason: string;
  };
}

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    ideaAnalysis: {
      type: Type.OBJECT,
      properties: {
        clarityScore: { type: Type.NUMBER },
        uniquenessScore: { type: Type.NUMBER },
        usefulnessScore: { type: Type.NUMBER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        score: { type: Type.NUMBER },
      },
      required: ["clarityScore", "uniquenessScore", "usefulnessScore", "strengths", "weaknesses", "insight", "score"],
    },
    developerPerspective: {
      type: Type.OBJECT,
      properties: {
        feasibilityScore: { type: Type.NUMBER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        challenges: { type: Type.ARRAY, items: { type: Type.STRING } },
        technicalRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        stackRecommendation: { type: Type.ARRAY, items: { type: Type.STRING } },
        complexity: { type: Type.STRING },
        score: { type: Type.NUMBER },
      },
      required: ["feasibilityScore", "strengths", "challenges", "technicalRisks", "insight", "stackRecommendation", "complexity", "score"],
    },
    businessPerspective: {
      type: Type.OBJECT,
      properties: {
        marketScore: { type: Type.NUMBER },
        opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        risks: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        monetization: { type: Type.STRING },
        competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
        scalability: { type: Type.STRING },
        score: { type: Type.NUMBER },
      },
      required: ["marketScore", "opportunities", "weaknesses", "risks", "insight", "monetization", "competitors", "scalability", "score"],
    },
    socialImpact: {
      type: Type.OBJECT,
      properties: {
        impactScore: { type: Type.NUMBER },
        positiveImpact: { type: Type.ARRAY, items: { type: Type.STRING } },
        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
        ethicalRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        benefit: { type: Type.STRING },
        ethicalConsiderations: { type: Type.ARRAY, items: { type: Type.STRING } },
        score: { type: Type.NUMBER },
      },
      required: ["impactScore", "positiveImpact", "concerns", "ethicalRisks", "insight", "benefit", "ethicalConsiderations", "score"],
    },
    risks: {
      type: Type.OBJECT,
      properties: {
        safetyScore: { type: Type.NUMBER },
        majorRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        failureScenarios: { type: Type.ARRAY, items: { type: Type.STRING } },
        mitigation: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        score: { type: Type.NUMBER },
      },
      required: ["safetyScore", "majorRisks", "failureScenarios", "mitigation", "insight", "score"],
    },
    codeQuality: {
      type: Type.OBJECT,
      properties: {
        qualityScore: { type: Type.NUMBER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingElements: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        score: { type: Type.NUMBER },
      },
      required: ["qualityScore", "strengths", "weaknesses", "missingElements", "insight", "score"],
    },
    ideaVsExecution: {
      type: Type.OBJECT,
      properties: {
        matchScore: { type: Type.NUMBER },
        matches: { type: Type.ARRAY, items: { type: Type.STRING } },
        missing: { type: Type.ARRAY, items: { type: Type.STRING } },
        engineeringCheck: { type: Type.ARRAY, items: { type: Type.STRING } },
        insight: { type: Type.STRING },
        score: { type: Type.NUMBER },
      },
      required: ["matchScore", "matches", "missing", "engineeringCheck", "insight", "score"],
    },
    finalVerdict: {
      type: Type.OBJECT,
      properties: {
        overallScore: { type: Type.NUMBER },
        decision: { type: Type.STRING },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        insights: { type: Type.ARRAY, items: { type: Type.STRING } },
        reason: { type: Type.STRING },
      },
      required: ["overallScore", "decision", "strengths", "weaknesses", "insights", "reason"],
    },
  },
  required: ["ideaAnalysis", "developerPerspective", "businessPerspective", "socialImpact", "risks", "codeQuality", "ideaVsExecution", "finalVerdict"],
};

export async function analyzeIdea(
  idea: string,
  problem: string,
  users: string,
  solution: string,
  githubSummary?: string
): Promise<ProjectAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    System: You are VerdictX — an AI decision intelligence system. 
    Your mission is to provide an elite, structured analysis of project concepts.
    
    You operate by simulating seven distinct expert agents:
    1. Market Analyst (Idea Analysis): Evaluates clarity, uniqueness, and usefulness. Provides sharp, non-generic observations.
    2. Senior Software Architect (Developer Analysis): Evaluates feasibility (0-10 scale), architectural complexity, scalability, and technical risks. Provides elite stack recommendations and deep technical insights.
    3. Business Strategist (Business Analysis): Evaluates market demand (0-10 scale), monetization strategy, competitive landscape, and growth potential. Identifies opportunities, weaknesses, and business risks. Provides critical business insights.
    4. Social Auditor (Social Analysis): Evaluates societal impact (0-10 scale), ethics, accessibility, and harm potential. Identifies positive impacts, active concerns, and long-term ethical risks. Provides sharp societal insights.
    5. Chief Risk Officer (Risk Analysis): Identifies fundamental failure points including execution, market, and adoption risks. Evaluates safety (0-10 scale), failure scenarios, and mitigation strategies. Provides sharp obsidian-level risk insights.
    6. Senior Software Reviewer (Code Quality): Evaluates repository structure, completeness, maintainability, and tech decisions. Identifies strengths, weaknesses, and missing elements. Only if GitHub context is provided; otherwise, evaluates the proposed solution's implied quality.
    7. Product Evaluator (Idea vs Execution): Compares the original vision (Idea/Problem) against the proposed/actual implementation (Solution/GitHub). Evaluates match score (0-10 scale), alignment, missing features, and over/under engineering. Provides sharp comparative insights.

    Then, as VerdictX Core, you will synthesize their outputs into a final structured report.

    PROJECT CONTEXT:
    Project Idea: ${idea}
    Problem Statement: ${problem}
    Target Users: ${users}
    Solution Description: ${solution}
    GitHub/Repo Context: ${githubSummary || "No repository provided. Evaluate the implied architecture of the solution description."}
    
    INSTRUCTIONS:
    - Combine all expert outputs into the specified JSON format.
    - Remove repetition and highlight the most critical insights.
    - Be objective, slightly ruthless, and realistic.
    - Decision: CONTINUE (High Potential), IMPROVE (Solid but flawed), PIVOT (Structural mismatch).
    - Score: 0-100 scale.
  `;

  const MAX_RETRIES = 5;
  let lastError: any = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini");
      return JSON.parse(text) as ProjectAnalysis;
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = 
        error?.status === 429 || 
        error?.code === 429 ||
        error?.message?.includes("429") || 
        error?.message?.includes("RESOURCE_EXHAUSTED") || 
        error?.message?.includes("high demand") ||
        error?.message?.includes("Too Many Requests");
      
      if (isRateLimit && i < MAX_RETRIES - 1) {
        // Linear increase in delay: 2s, 4s, 8s, 16s, 32s
        const delay = Math.pow(2, i + 1) * 1000 + Math.random() * 1000;
        console.warn(`Gemini API high demand (Attempt ${i + 1}/${MAX_RETRIES}). Spikes are temporary. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Strategic systems overwhelmed by high demand. Please try again in 30 seconds.");
}
