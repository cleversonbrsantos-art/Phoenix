import "dotenv/config";

/**
 * Central configuration module.
 *
 * Uses getters instead of a static object so that environment variables
 * are read at call time — not at import time.
 *
 * dotenv is loaded here (import "dotenv/config") so it is guaranteed
 * to run before any value is accessed, regardless of import order in server.ts.
 */
export const config = {
  get geminiApiKey()     { return process.env.GEMINI_API_KEY      || ""; },
  get openRouterApiKey() { return process.env.OPENROUTER_API_KEY  || ""; },
  get nvidiaApiKey()     { return process.env.NVIDIA_API_KEY       || ""; },
  get maxMemoryTokens()  { return parseInt(process.env.MAX_MEMORY_TOKENS || "8192", 10); },
  get emotionEnabled()   { return process.env.EMOTION_ENABLED !== "false"; },
  get environment()      { return process.env.NODE_ENV || "development"; },
};
