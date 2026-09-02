import { GoogleGenAI } from "@google/genai";
import { config } from "../config/settings";

/**
 * LLM Client — Gemini API via @google/genai SDK
 *
 * Model: gemini-3.5-flash (free tier, no credit card required)
 * Rate limits (free tier): ~10-15 RPM, ~1,500 RPD
 *
 * The Daydream Engine and Subconscious cycle have delays built in
 * to stay within the free tier during normal personal use.
 */

let genaiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genaiClient) {
    if (!config.geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is not defined in .env — see docs/SETUP.md for instructions."
      );
    }
    genaiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return genaiClient;
}

export const llmClient = {
  async generateText(prompt: string, systemInstruction?: string): Promise<string> {
    const ai = getClient();

    try {
      const result = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        ...(systemInstruction && {
          config: { systemInstruction },
        }),
      });

      return result.text?.trim() ?? "";

    } catch (error: any) {
      const isRetryable =
        error?.status === 429 ||
        error?.status === 503 ||
        error?.message?.includes("rate limit") ||
        error?.message?.includes("RESOURCE_EXHAUSTED") ||
        error?.message?.includes("high demand") ||
        error?.message?.includes("UNAVAILABLE");

      if (isRetryable) {
        const delays = [5000, 15000, 30000];
        for (let attempt = 0; attempt < delays.length; attempt++) {
          const wait = delays[attempt];
          console.warn(
            `[LLM] Gemini busy (attempt ${attempt + 1}/${delays.length}). Retrying in ${wait / 1000}s...`
          );
          await new Promise(resolve => setTimeout(resolve, wait));
          try {
            const retry = await ai.models.generateContent({
              model: "gemini-3.5-flash",
              contents: prompt,
              ...(systemInstruction && {
                config: { systemInstruction },
              }),
            });
            return retry.text?.trim() ?? "";
          } catch (retryError: any) {
            const stillBusy =
              retryError?.status === 429 ||
              retryError?.status === 503 ||
              retryError?.message?.includes("high demand") ||
              retryError?.message?.includes("UNAVAILABLE");
            if (!stillBusy || attempt === delays.length - 1) {
              return "Phoenix is temporarily unavailable — Gemini is under high load. Please try again in a moment.";
            }
          }
        }
      }

      console.error("[LLM] Gemini API error:", error.message || error);
      throw error;
    }
  }
};
