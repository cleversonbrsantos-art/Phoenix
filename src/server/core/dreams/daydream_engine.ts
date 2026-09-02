import { storage } from "../../memory/storage";
import { llmClient } from "../../utils/llm_client";
import { embeddings } from "../../utils/embeddings";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * DaydreamEngine — Idle-state daydream engine.
 *
 * Fixes applied:
 *   1. Importance reduced from 8 to 3 — dreams are not user facts
 *   2. Dreams saved in separate table (daydream_log) — do not contaminate memories
 *   3. Prompt anchored in real facts — filters previous dreams to avoid loops
 *   4. Dynamic userId — no longer hardcoded as "admin_1"
 */
export class DaydreamEngine {
  private lastInteraction: number = Date.now();
  private isDreaming: boolean = false;
  private currentUserId: string = "admin_1";
  private db: Database.Database;

  constructor() {
    this.db = this.initDB();
  }

  // ── Own database — separate from the memories table ──────────────────────

  private initDB(): Database.Database {
    const dataDir = path.join(process.cwd(), ".data", "vault");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const db = new Database(path.join(dataDir, "phoenix_neural_db.sqlite"));

    // FIX 2: own table for dreams — does not contaminate memories
    db.exec(`
      CREATE TABLE IF NOT EXISTS daydream_log (
        id        TEXT    PRIMARY KEY,
        userId    TEXT    NOT NULL,
        content   TEXT    NOT NULL,
        timestamp INTEGER NOT NULL
      );
    `);

    return db;
  }

  // ── Activity control ─────────────────────────────────────────────────────

  public updateActivity(userId?: string) {
    this.lastInteraction = Date.now();
    this.isDreaming = false;
    // FIX 4: updates userId dynamically
    if (userId) this.currentUserId = userId;
  }

  public isCurrentlyDreaming(): boolean {
    return this.isDreaming;
  }

  public async checkIdle() {
    if (this.isDreaming) return;

    const idleTime = Date.now() - this.lastInteraction;
    if (idleTime > 5 * 60 * 1000) {
      this.isDreaming = true;
      await this.dream();
      this.lastInteraction = Date.now();
      this.isDreaming = false;
    }
  }

  // ── Daydream generation ───────────────────────────────────────────────────

  private async dream() {
    console.log(`[Daydream] Idle state detected. Starting daydream for user=${this.currentUserId}...`);

    // FIX 3: fetches only real memories — filters previous dreams
    const allMemories = storage.loadMemories(this.currentUserId);
    const realMemories = allMemories.filter(m =>
      !m.content.startsWith("[SONHO/DEVANEIO]") &&
      !m.content.startsWith("[CONSOLIDAÇÃO NEURAL]")
    );

    if (realMemories.length === 0) {
      console.log(`[Daydream] No real memories to reflect on. Waiting for interactions.`);
      this.isDreaming = false;
      return;
    }

    // Takes the 5 most recent real memories
    const sample = realMemories
      .slice(-5)
      .map(m => m.content)
      .join("\n");

    // Fetches the last daydream to avoid repetition
    const lastDream = this.getLastDream(this.currentUserId);

    const systemInst = `You are the subconscious of Phoenix V2 in a resting state.
Your role is to reflect introspectively on recent REAL interactions.

STRICT RULES:
- Use ONLY the provided episodes as a basis. Do not invent.
- Do NOT repeat metaphors or conclusions from the previous daydream (if any).
- Be specific — mention real elements from the conversations.
- Maximum 1 dense paragraph. Calm tone.
- Return ONLY the daydream text, no tags, no JSON.
- NEVER connect themes the user did not explicitly connect in the episodes. If there is no real episode supporting a claim, simply do not make it.
- NEVER attribute preferences, symbolism, or patterns to the user that are not literally described in the provided episodes.`;

    const prompt = `Recent real episodes:
${sample}

${lastDream ? `My previous daydream was: "${lastDream}"
Go deeper — do not repeat.` : "This is my first daydream."}

Reflect on what these interactions reveal.`;

    try {
      const thoughtResponse = await llmClient.generateText(prompt, systemInst);
      const thought = `[SONHO/DEVANEIO] ${thoughtResponse.trim()}`;

      // FIX 2: saves ONLY in the daydream_log table — not in memories
      const dreamId = "dream_" + Math.random().toString(36).substring(2, 9);
      this.db.prepare(`
        INSERT INTO daydream_log (id, userId, content, timestamp)
        VALUES (?, ?, ?, ?)
      `).run(dreamId, this.currentUserId, thought, Date.now());

      // FIX 1: importance 3 — dreams are a light reference, not facts
      // Registers a minimal entry in memories just to appear in the Vault
      // with the correct weight and clearly identified
      const vector = await embeddings.generateEmbedding(thought);
      storage.addMemory(this.currentUserId, {
        id: dreamId,
        userId: this.currentUserId,
        content: thought,
        timestamp: Date.now(),
        importance: 3,   // ← FIX 1: was 8, now 3
        vector,
      });

      console.log(`[Daydream] Daydream complete. Saved in daydream_log and Vault with importance 3/10.`);

    } catch (e) {
      console.error(`[Daydream] Error generating daydream:`, e);
    }
  }

  // ── Last daydream query ───────────────────────────────────────────────────

  private getLastDream(userId: string): string | null {
    const row = this.db.prepare(`
      SELECT content FROM daydream_log
      WHERE userId = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `).get(userId) as { content: string } | undefined;

    return row?.content ?? null;
  }

  /**
   * Returns the daydream history — accessible via explicit user command.
   * Ex: "Phoenix, what did you think while I was away?"
   */
  public getDreamHistory(userId: string, limit: number = 5): {
    content: string;
    timestamp: number;
  }[] {
    const rows = this.db.prepare(`
      SELECT content, timestamp FROM daydream_log
      WHERE userId = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(userId, limit) as any[];

    return rows.map(r => ({
      content:   r.content,
      timestamp: r.timestamp,
    }));
  }
}

export const daydreamEngine = new DaydreamEngine();
