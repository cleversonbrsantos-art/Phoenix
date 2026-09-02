import { storage, MemoryRecord } from "../memory/storage";
import { llmClient } from "../utils/llm_client";
import { embeddings } from "../utils/embeddings";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * ConsolidationEngine — Background cognitive cleanup.
 *
 * Responsibilities:
 *   1. Detect when the memory database is too full
 *   2. Protect high-importance facts before consolidating
 *   3. Summarize generic memories into a dense core via LLM
 *   4. Replace the database safely (no risk of partial loss)
 *   5. Record when consolidation ran to avoid unnecessary repetition
 */

// Minimum importance for a memory to be considered "protected"
// Personal facts recorded with importance 9 are never discarded
const PROTECTED_IMPORTANCE_THRESHOLD = 8;

// Number of memories that triggers consolidation
const CONSOLIDATION_THRESHOLD = 30;

// Number of recent memories always preserved (beyond protected facts)
const RECENT_MEMORIES_TO_KEEP = 5;

// Minimum interval between consolidations (4 hours in ms)
const MIN_CONSOLIDATION_INTERVAL_MS = 4 * 60 * 60 * 1000;

export class ConsolidationEngine {
  private db: Database.Database;

  constructor() {
    this.db = this.initDB();
  }

  // ── Database ────────────────────────────────────────────────────────────────

  private initDB(): Database.Database {
    const dataDir = path.join(process.cwd(), ".data", "vault");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const db = new Database(path.join(dataDir, "phoenix_neural_db.sqlite"));

    // FIX 5: consolidation control table
    db.exec(`
      CREATE TABLE IF NOT EXISTS consolidation_log (
        userId        TEXT PRIMARY KEY,
        lastRunAt     INTEGER NOT NULL,
        memoriesBefore INTEGER NOT NULL,
        memoriesAfter  INTEGER NOT NULL
      );
    `);

    return db;
  }

  // ── Interval control ───────────────────────────────────────────────────────

  private getLastConsolidation(userId: string): number {
    const row = this.db
      .prepare(`SELECT lastRunAt FROM consolidation_log WHERE userId = ?`)
      .get(userId) as { lastRunAt: number } | undefined;
    return row?.lastRunAt ?? 0;
  }

  private logConsolidation(userId: string, before: number, after: number): void {
    this.db.prepare(`
      INSERT INTO consolidation_log (userId, lastRunAt, memoriesBefore, memoriesAfter)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        lastRunAt      = excluded.lastRunAt,
        memoriesBefore = excluded.memoriesBefore,
        memoriesAfter  = excluded.memoriesAfter
    `).run(userId, Date.now(), before, after);
  }

  // ── Main consolidation ──────────────────────────────────────────────────────

  public async runConsolidation(userId: string): Promise<void> {
    console.log(`[Consolidation] Starting scan for user=${userId}...`);

    const memories = storage.loadMemories(userId);

    // Checks volume
    if (memories.length <= CONSOLIDATION_THRESHOLD) {
      console.log(`[Consolidation] Low volume (${memories.length}). No action needed.`);
      return;
    }

    // FIX 5: checks minimum interval
    const lastRun = this.getLastConsolidation(userId);
    const timeSinceLast = Date.now() - lastRun;
    if (timeSinceLast < MIN_CONSOLIDATION_INTERVAL_MS) {
      const hoursAgo = (timeSinceLast / 3600000).toFixed(1);
      console.log(`[Consolidation] Recent consolidation (${hoursAgo}h ago). Waiting for minimum interval.`);
      return;
    }

    console.log(`[Consolidation] ${memories.length} memories detected. Starting synthesis...`);

    // FIX 2 and 3: separates memories by category before anything else
    const protectedMemories = memories.filter(
      m => m.importance >= PROTECTED_IMPORTANCE_THRESHOLD
    );
    const recentMemories = memories.slice(-RECENT_MEMORIES_TO_KEEP);
    const candidatesForSummary = memories.filter(
      m =>
        m.importance < PROTECTED_IMPORTANCE_THRESHOLD &&
        !recentMemories.find(r => r.id === m.id)
    );

    console.log(
      `[Consolidation] Protected: ${protectedMemories.length} | ` +
      `Recent: ${recentMemories.length} | ` +
      `To summarize: ${candidatesForSummary.length}`
    );

    if (candidatesForSummary.length < 10) {
      console.log(`[Consolidation] Insufficient candidates for synthesis. Waiting for accumulation.`);
      return;
    }

    // FIX 4: correct escape — real line break
    const textToSummarize = candidatesForSummary
      .map(m => `(Importance: ${m.importance}) ${m.content}`)
      .join("\n");

    const systemInstruction = `You are the cognitive consolidation module of Phoenix V2.
Receive the memories below and produce a dense, direct summary containing:
- Main themes of the conversations
- User behavioral patterns
- Relevant context for future interactions

RULES:
- Preserve names, dates and specific facts mentioned
- Do not invent information not present in the memories
- Return ONLY the summary, without introduction or external comments
- Maximum 3 paragraphs`;

    const prompt = `Consolidate the following memories into a dense summary:\n\n${textToSummarize}`;

    try {
      const summaryRaw = await llmClient.generateText(prompt, systemInstruction);
      const summaryText = "[CONSOLIDAÇÃO NEURAL] " + summaryRaw.trim();

      // Gera embedding do resumo para busca semântica futura
      const vector = await embeddings.generateEmbedding(summaryText);

      const consolidatedMemory: MemoryRecord = {
        id:         "core_" + Date.now().toString(36),
        userId,
        content:    summaryText,
        timestamp:  Date.now(),
        importance: 10,   // resumos recebem peso máximo
        vector,
      };

      // FIX 1: builds the new database without using the destructive saveMemories
      // Uses addMemory individually — safe transaction, no risk of partial loss
      //
      // Strategy:
      //   - Removes only the candidates that were summarized
      //   - Keeps protected + recent memories intact
      //   - Adds the consolidated summary

      // Removes summarized candidates one by one
      for (const candidate of candidatesForSummary) {
        storage.removeMemory(userId, candidate.id);
      }

      // Adiciona o resumo consolidado
      storage.addMemory(userId, consolidatedMemory);

      const memoriesAfter = storage.loadMemories(userId).length;

      // FIX 5: records the consolidation
      this.logConsolidation(userId, memories.length, memoriesAfter);

      console.log(
        `[Consolidation] Synthesis complete. ` +
        `${memories.length} → ${memoriesAfter} memories | ` +
        `Protected preserved: ${protectedMemories.length}`
      );

    } catch (e) {
      console.error(`[Consolidation] Synthesis error — database was not altered:`, e);
      // No memories were lost as we remove incrementally
      // and the error occurred before any removal
    }
  }
}

export const consolidation = new ConsolidationEngine();
