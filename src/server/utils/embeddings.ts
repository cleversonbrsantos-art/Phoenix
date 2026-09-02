import { GoogleGenAI } from "@google/genai";
import { config } from "../config/settings";

/**
 * Embeddings Client — Gemini API via @google/genai SDK
 *
 * Model: gemini-embedding-001
 * ⚠️  text-embedding-004 was deprecated January 2026 — do not use it.
 *
 * Output: 768-dimensional vectors (taskType: SEMANTIC_SIMILARITY)
 * Compatible with existing vectors stored in phoenix_neural_db.sqlite.
 *
 * Falls back to [] on error — the memory system handles this gracefully
 * by falling back to recency/priority scoring.
 */

let genaiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!config.geminiApiKey) {
    console.error("[Embeddings] GEMINI_API_KEY not configured.");
    return null;
  }
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  }
  return genaiClient;
}

export const embeddings = {

  /**
   * Converts text into a numeric vector for semantic similarity search.
   * Returns [] on error — never silently drops failures without logging.
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const ai = getClient();
    if (!ai) return [];

    // gemini-embedding-001 has a 2,048 token limit
    const truncated = text.length > 6000 ? text.substring(0, 6000) : text;

    try {
      const result = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: truncated,
        config: {
          taskType: "SEMANTIC_SIMILARITY",
        },
      });

      const vector = result.embeddings?.[0]?.values;

      if (!Array.isArray(vector) || vector.length === 0) {
        console.error("[Embeddings] Unexpected response:", JSON.stringify(result));
        return [];
      }

      return vector as number[];

    } catch (error: any) {
      console.error("[Embeddings] Request failed:", error.message || error);
      return [];
    }
  },

  /**
   * Cosine similarity between two vectors.
   * Returns 0 if either vector is empty or zero-magnitude.
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length === 0 || vecB.length === 0) return 0;
    if (vecA.length !== vecB.length) {
      console.warn("[Embeddings] Vectors have different dimensions — similarity skipped.");
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA      += vecA[i] * vecA[i];
      normB      += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  },

  /**
   * Validates that a vector is non-empty and usable.
   */
  isValid(vector: number[]): boolean {
    return Array.isArray(vector) && vector.length > 0;
  },
};
