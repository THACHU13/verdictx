import { GoogleGenAI } from "@google/genai";

// Standard models to attempt in order of recommended suitability & reliability
const MODELS_TO_TRY = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-pro"];

interface RetryOptions {
  contents: any;
  config?: any;
}

/**
 * Executes a robust Gemini generateContent call, falling back to other reliable models
 * and performing exponential backoff if a 503 (high demand) or 429 (rate limit) is encountered.
 */
export async function generateContentWithRetry(
  ai: GoogleGenAI,
  options: RetryOptions
): Promise<any> {
  let lastError: any = null;

  for (const model of MODELS_TO_TRY) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[GeminiHelper] Calling generateContent with model: ${model} (Attempt ${attempt}/3)`);
        
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: options.config,
        });

        if (response && response.text) {
          console.log(`[GeminiHelper] Success using model: ${model} on attempt ${attempt}`);
          return response;
        }
        
        throw new Error("Empty text response received from model.");
      } catch (err: any) {
        lastError = err;
        const errorMsg = String(err.message || err.statusText || JSON.stringify(err));
        console.warn(`[GeminiHelper] Warning: Model ${model} on attempt ${attempt} failed. Error:`, errorMsg);

        // Check if the error is a transient/rate-limiting/high-demand error
        const isTransient = 
          errorMsg.includes("503") || 
          errorMsg.includes("429") || 
          errorMsg.toLowerCase().includes("unavailable") || 
          errorMsg.toLowerCase().includes("exhausted") || 
          errorMsg.toLowerCase().includes("demand") ||
          errorMsg.toLowerCase().includes("overloaded");

        if (isTransient && attempt < 3) {
          const backoffDelay = Math.pow(2, attempt) * 1500; // 3s, 6s
          console.log(`[GeminiHelper] Transient error detected. Retrying ${model} in ${backoffDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        } else {
          // If it is non-transient, or we have exhausted attempts for this model, fallback to the next model in the cascade
          console.log(`[GeminiHelper] Switching model cascade step away from ${model} due to persistent error.`);
          break;
        }
      }
    }
  }

  // If all models failed, throw the last received error
  throw lastError || new Error("All attempts to call Gemini API endpoints failed.");
}
