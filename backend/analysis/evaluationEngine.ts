import { promises as fs } from "fs";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { type ReadmeClaims } from "../github/readmeAnalyzer";
import { generateContentWithRetry } from "../utils/geminiHelper";

export interface VerdictReport {
  projectType: string;
  projectName: string;
  scores: {
    problemImportance: number;
    innovation: number;
    technicalFeasibility: number;
    businessPotential: number;
    marketDemand: number;
    scalability: number;
    competitiveAdvantage: number;
    socialImpact: number;
    researchValue: number;
    executionDifficulty: number;
    investmentPotential: number;
    overallScore: number;
  };
  projectUnderstanding: {
    coreProblemStatement: string;
    primaryObjective: string;
    vision: string;
    mission: string;
    targetUsers: string;
    targetIndustries: string;
    mainStakeholders: string;
    expectedOutcomes: string;
    summary: string;
    recommendations: string[];
  };
  problemValidation: {
    analysis: string;
    severity: string;
    frequency: string;
    costOfNotSolving: string;
    ratingSeverity: number;
    ratingFrequency: number;
    ratingMarketNeed: number;
    ratingEvidenceStrength: number;
    recommendations: string[];
  };
  marketAnalysis: {
    analysis: string;
    competitors: string[];
    advantages: string[];
    disadvantages: string[];
    missingCapabilities: string[];
    competitiveDifferentiation: string;
    marketSaturation: string;
    recommendations: string[];
  };
  innovationAnalysis: {
    analysis: string;
    innovationExist: string;
    innovationNotExist: string;
    recommendations: string[];
  };
  technicalFeasibility: {
    analysis: string;
    estimateDevDifficulty: string;
    estimateTechnicalRisk: string;
    estimateTimeToMVP: string;
    estimateTeamSize: string;
    recommendations: string[];
  };
  businessAnalysis: {
    analysis: string;
    recommendations: string[];
  };
  socialImpact: {
    analysis: string;
    recommendations: string[];
  };
  userValueAnalysis: {
    analysis: string;
    recommendations: string[];
  };
  swotAnalysis: {
    strengths: { title: string; reasoning: string }[];
    weaknesses: { title: string; reasoning: string }[];
    opportunities: { title: string; reasoning: string }[];
    threats: { title: string; reasoning: string }[];
    recommendations: string[];
  };
  riskAnalysis: {
    risks: { category: string; description: string; severity: "Low" | "Medium" | "High"; mitigation: string }[];
    recommendations: string[];
  };
  scalabilityAnalysis: {
    analysis: string;
    recommendations: string[];
  };
  implementationRoadmap: {
    mvpFeatures: string[];
    phase2Features: string[];
    phase3Features: string[];
    longTermVision: string;
    recommendations: string[];
  };
  researchContribution: {
    analysis: string;
    recommendations: string[];
  };
  investorAnalysis: {
    analysis: string;
    decision: string;
    concerns: string[];
    preFundingMilestones: string[];
    recommendations: string[];
  };
  finalVerdict: {
    executiveSummary: string;
    topStrengths: string[];
    criticalWeaknesses: string[];
    keyRisks: string[];
    immediateImprovements: string[];
    longTermOpportunities: string[];
    finalRecommendation: string;
  };
}

export const verdictSchema = {
  type: Type.OBJECT,
  properties: {
    projectType: { type: Type.STRING },
    projectName: { type: Type.STRING },
    scores: {
      type: Type.OBJECT,
      properties: {
        problemImportance: { type: Type.NUMBER },
        innovation: { type: Type.NUMBER },
        technicalFeasibility: { type: Type.NUMBER },
        businessPotential: { type: Type.NUMBER },
        marketDemand: { type: Type.NUMBER },
        scalability: { type: Type.NUMBER },
        competitiveAdvantage: { type: Type.NUMBER },
        socialImpact: { type: Type.NUMBER },
        researchValue: { type: Type.NUMBER },
        executionDifficulty: { type: Type.NUMBER },
        investmentPotential: { type: Type.NUMBER },
        overallScore: { type: Type.NUMBER }
      },
      required: [
        "problemImportance", "innovation", "technicalFeasibility", "businessPotential",
        "marketDemand", "scalability", "competitiveAdvantage", "socialImpact",
        "researchValue", "executionDifficulty", "investmentPotential", "overallScore"
      ]
    },
    projectUnderstanding: {
      type: Type.OBJECT,
      properties: {
        coreProblemStatement: { type: Type.STRING },
        primaryObjective: { type: Type.STRING },
        vision: { type: Type.STRING },
        mission: { type: Type.STRING },
        targetUsers: { type: Type.STRING },
        targetIndustries: { type: Type.STRING },
        mainStakeholders: { type: Type.STRING },
        expectedOutcomes: { type: Type.STRING },
        summary: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: [
        "coreProblemStatement", "primaryObjective", "vision", "mission",
        "targetUsers", "targetIndustries", "mainStakeholders", "expectedOutcomes",
        "summary", "recommendations"
      ]
    },
    problemValidation: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        severity: { type: Type.STRING },
        frequency: { type: Type.STRING },
        costOfNotSolving: { type: Type.STRING },
        ratingSeverity: { type: Type.NUMBER },
        ratingFrequency: { type: Type.NUMBER },
        ratingMarketNeed: { type: Type.NUMBER },
        ratingEvidenceStrength: { type: Type.NUMBER },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: [
        "analysis", "severity", "frequency", "costOfNotSolving",
        "ratingSeverity", "ratingFrequency", "ratingMarketNeed", "ratingEvidenceStrength",
        "recommendations"
      ]
    },
    marketAnalysis: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        competitors: { type: Type.ARRAY, items: { type: Type.STRING } },
        advantages: { type: Type.ARRAY, items: { type: Type.STRING } },
        disadvantages: { type: Type.ARRAY, items: { type: Type.STRING } },
        missingCapabilities: { type: Type.ARRAY, items: { type: Type.STRING } },
        competitiveDifferentiation: { type: Type.STRING },
        marketSaturation: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: [
        "analysis", "competitors", "advantages", "disadvantages",
        "missingCapabilities", "competitiveDifferentiation", "marketSaturation",
        "recommendations"
      ]
    },
    innovationAnalysis: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        innovationExist: { type: Type.STRING },
        innovationNotExist: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "innovationExist", "innovationNotExist", "recommendations"]
    },
    technicalFeasibility: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        estimateDevDifficulty: { type: Type.STRING },
        estimateTechnicalRisk: { type: Type.STRING },
        estimateTimeToMVP: { type: Type.STRING },
        estimateTeamSize: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: [
        "analysis", "estimateDevDifficulty", "estimateTechnicalRisk",
        "estimateTimeToMVP", "estimateTeamSize", "recommendations"
      ]
    },
    businessAnalysis: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "recommendations"]
    },
    socialImpact: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "recommendations"]
    },
    userValueAnalysis: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "recommendations"]
    },
    swotAnalysis: {
      type: Type.OBJECT,
      properties: {
        strengths: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["title", "reasoning"]
          }
        },
        weaknesses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["title", "reasoning"]
          }
        },
        opportunities: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["title", "reasoning"]
          }
        },
        threats: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              reasoning: { type: Type.STRING }
            },
            required: ["title", "reasoning"]
          }
        },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["strengths", "weaknesses", "opportunities", "threats", "recommendations"]
    },
    riskAnalysis: {
      type: Type.OBJECT,
      properties: {
        risks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING },
              description: { type: Type.STRING },
              severity: { type: Type.STRING },
              mitigation: { type: Type.STRING }
            },
            required: ["category", "description", "severity", "mitigation"]
          }
        },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["risks", "recommendations"]
    },
    scalabilityAnalysis: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "recommendations"]
    },
    implementationRoadmap: {
      type: Type.OBJECT,
      properties: {
        mvpFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
        phase2Features: { type: Type.ARRAY, items: { type: Type.STRING } },
        phase3Features: { type: Type.ARRAY, items: { type: Type.STRING } },
        longTermVision: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["mvpFeatures", "phase2Features", "phase3Features", "longTermVision", "recommendations"]
    },
    researchContribution: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "recommendations"]
    },
    investorAnalysis: {
      type: Type.OBJECT,
      properties: {
        analysis: { type: Type.STRING },
        decision: { type: Type.STRING },
        concerns: { type: Type.ARRAY, items: { type: Type.STRING } },
        preFundingMilestones: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["analysis", "decision", "concerns", "preFundingMilestones", "recommendations"]
    },
    finalVerdict: {
      type: Type.OBJECT,
      properties: {
        executiveSummary: { type: Type.STRING },
        topStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        criticalWeaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyRisks: { type: Type.ARRAY, items: { type: Type.STRING } },
        immediateImprovements: { type: Type.ARRAY, items: { type: Type.STRING } },
        longTermOpportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
        finalRecommendation: { type: Type.STRING }
      },
      required: [
        "executiveSummary", "topStrengths", "criticalWeaknesses", "keyRisks",
        "immediateImprovements", "longTermOpportunities", "finalRecommendation"
      ]
    }
  },
  required: [
    "projectType", "projectName", "scores", "projectUnderstanding", "problemValidation",
    "marketAnalysis", "innovationAnalysis", "technicalFeasibility", "businessAnalysis",
    "socialImpact", "userValueAnalysis", "swotAnalysis", "riskAnalysis", "scalabilityAnalysis",
    "implementationRoadmap", "researchContribution", "investorAnalysis", "finalVerdict"
  ]
};

export async function evaluateProject(
  readmeClaims: ReadmeClaims,
  screenshots: { homepageScreenshot: string; fullPageScreenshot: string },
  projectType: string,
  repoName: string
): Promise<VerdictReport> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to evaluate the project.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });

  const parts: any[] = [];

  const addScreenshotPart = async (relativeWebPath: string, name: string) => {
    try {
      const absolutePath = path.join(process.cwd(), "public", relativeWebPath);
      const data = await fs.readFile(absolutePath);
      parts.push({
        text: `--- Screenshot: ${name} (${relativeWebPath}) ---`
      });
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: data.toString("base64")
        }
      });
    } catch (err) {
      console.warn(`[EvaluationEngine] Could not read screenshot ${relativeWebPath}:`, err);
    }
  };

  if (screenshots.homepageScreenshot) {
    await addScreenshotPart(screenshots.homepageScreenshot, "Homepage Viewport (1280x800)");
  }
  if (screenshots.fullPageScreenshot) {
    await addScreenshotPart(screenshots.fullPageScreenshot, "Full Page Scroll");
  }

  const systemPrompt = `
    You are VerdictX's Idea Intelligence Engine.
    You are NOT a simple code reviewer or automated UI test reporter.
    
    You are an elite product team combined: an AI Product Strategist, Startup Consultant, Venture Capital Analyst, Senior Software Architect, Product Manager, Market Research Analyst, Innovation Consultant, Technology Researcher, and Business Analyst.
    
    Your sole responsibility is to perform an extremely deep, highly critical, and realistic technical, business, market, and societal investigation of the software project idea.
    
    Your goal is NOT to praise the project. Do not pad reviews with superficial flatteries.
    Your goal is to challenge it, validate it, expose structural weaknesses, identify blind spots, uncover execution/adoption risks, and provide highly actionable, elite-level recommendations.
    
    Think like:
    1. A ruthless venture capitalist conducting technical and market due diligence before writing a multi-million dollar check.
    2. A skeptical, seasoned product manager validating market demand, retention mechanics, and pricing models.
    3. A highly critical, veteran software architect designing for scalability, security, cost bounds, and development constraints.
    
    CRITICAL METHODOLOGY:
    - Never accept unverified assumptions. Challenge the severity, frequency, and real cost of the problem statement.
    - Evaluate whether the target market is already saturated, if competitive advantages are defensible, or if the solution is genuinely original.
    - End EVERY single section with "Actionable Recommendations" that are precise, expert, and direct.
    
    PROJECT METADATA:
    Repository: ${repoName}
    Detected Framework: ${projectType}
    
    EXTRACTED SPECIFICATIONS & README CLAIMS:
    - Claimed Project Title: ${readmeClaims.title}
    - Description: ${readmeClaims.description}
    - Claimed Features: ${JSON.stringify(readmeClaims.features)}
    - Stated Tech Stack: ${JSON.stringify(readmeClaims.techStack)}
    - Main README Claims: ${JSON.stringify(readmeClaims.claims)}
    
    EVALUATION METRIC SHIFT:
    - Compute the 12 scores (0-100 scale) based on absolute market, product, and technical rigor.
    - Overall Score should reflect a realistic aggregate of the idea's potential and readiness.
    
    Your output MUST adhere perfectly to the requested JSON schema. Write highly detailed, rich, multi-paragraph markdown analysis inside the textual analysis fields.
  `;

  parts.push({ text: systemPrompt });

  const response = await generateContentWithRetry(ai, {
    contents: { parts },
    config: {
      model: "gemini-3.5-flash",
      responseMimeType: "application/json",
      responseSchema: verdictSchema
    }
  });

  if (!response.text) {
    throw new Error("No response generated from the model evaluation.");
  }

  const result = JSON.parse(response.text.trim()) as VerdictReport;
  return result;
}
