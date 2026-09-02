import { profileManager } from "../../users/profile_manager";
import { selfModel } from "../../psychology/self_model";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * IncrementalLearn — Progressive learning of user patterns.
 *
 * Fixes applied:
 *   1. Learning persists and reaches context via self_model
 *   2. Detects multiple patterns beyond verbosity
 *   3. Contextual detection — not just isolated words
 *   4. Accumulates history — trend prevails over single event
 *   5. Integrates with self_model so the entire pipeline has access
 */

// ── Types ─────────────────────────────────────────────────────────────────────

interface PatternCount {
  pattern: string;
  count: number;
  lastSeen: number;
}

interface LearnedProfile {
  verbosity:    "high" | "low" | "neutral";
  topics:       string[];          // temas de interesse detectados
  style:        "formal" | "casual" | "neutral";
  peakHours:    number[];          // horas do dia com mais atividade
  questionTypes: string[];         // tipos de pergunta mais frequentes
}

// ── Detectable patterns ───────────────────────────────────────────────────────

const PATTERNS = {
  verbosity_high: [
    /mais detalhes?/i,
    /explica melhor/i,
    /avalie (fundo|profundamente)/i,
    /aprofunda/i,
    /elabora/i,
    /me conta mais/i,
  ],
  verbosity_low: [
    /seja rápido/i,
    /resuma?/i,
    /direto ao ponto/i,
    /resumindo/i,
    /de forma (curta|breve|simples)/i,
    /sem enrolação/i,
  ],
  style_formal: [
    /por favor/i,
    /poderia/i,
    /gostaria/i,
    /seria possível/i,
  ],
  style_casual: [
    /cara/i,
    /mano/i,
    /vlw/i,
    /blz/i,
    /kkk/i,
    /haha/i,
  ],
  topic_tech: [
    /código/i,
    /programação/i,
    /arquitetura/i,
    /sistema/i,
    /algoritmo/i,
    /banco de dados/i,
    /api/i,
  ],
  topic_ai: [
    /inteligência artificial/i,
    /machine learning/i,
    /modelo/i,
    /llm/i,
    /neural/i,
    /ia/i,
  ],
  question_how: [
    /como (funciona|fazer|implementar)/i,
    /de que forma/i,
    /qual o jeito/i,
  ],
  question_why: [
    /por que/i,
    /por quê/i,
    /qual o motivo/i,
    /qual a razão/i,
  ],
};

export class IncrementalLearn {
  private db: Database.Database;

  constructor() {
    this.db = this.initDB();
  }

  // ── Database ────────────────────────────────────────────────────────────────

  private initDB(): Database.Database {
    const dataDir = path.join(process.cwd(), ".data", "vault");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const db = new Database(path.join(dataDir, "phoenix_neural_db.sqlite"));

    // FIX 4: accumulated pattern count table
    db.exec(`
      CREATE TABLE IF NOT EXISTS learned_patterns (
        userId    TEXT    NOT NULL,
        pattern   TEXT    NOT NULL,
        count     INTEGER DEFAULT 1,
        lastSeen  INTEGER NOT NULL,
        PRIMARY KEY (userId, pattern)
      );
    `);

    return db;
  }

  // ── Main analysis ───────────────────────────────────────────────────────────

  public analyzeInteraction(userId: string, input: string): void {
    const profile = profileManager.getProfile(userId);
    if (!profile) return;

    const detected: string[] = [];

    // Detects all patterns in the current input
    for (const [patternKey, regexList] of Object.entries(PATTERNS)) {
      if (regexList.some(r => r.test(input))) {
        detected.push(patternKey);
        this.incrementPattern(userId, patternKey);
      }
    }

    // FIX 3: activity hour
    const hour = new Date().getHours();
    this.incrementPattern(userId, `hour_${hour}`);

    if (detected.length === 0) return;

    console.log(`[IncrementalLearn] Patterns detected for user=${userId}: ${detected.join(", ")}`);

    // FIX 4: derives profile from accumulated history
    const learnedProfile = this.deriveProfile(userId);

    // FIX 1: persists in profileManager
    profile.preferences = {
      ...profile.preferences,
      verbosity:    learnedProfile.verbosity,
      style:        learnedProfile.style,
      topics:       learnedProfile.topics,
      peakHours:    learnedProfile.peakHours,
      questionTypes: learnedProfile.questionTypes,
    };

    // FIX 5: updates self_model so the entire pipeline has access
    this.updateSelfModel(userId, learnedProfile);
  }

  // ── Pattern accumulation ────────────────────────────────────────────────────

  private incrementPattern(userId: string, pattern: string): void {
    this.db.prepare(`
      INSERT INTO learned_patterns (userId, pattern, count, lastSeen)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(userId, pattern) DO UPDATE SET
        count    = count + 1,
        lastSeen = excluded.lastSeen
    `).run(userId, pattern, Date.now());
  }

  private getPatternCount(userId: string, pattern: string): number {
    const row = this.db
      .prepare(`SELECT count FROM learned_patterns WHERE userId = ? AND pattern = ?`)
      .get(userId, pattern) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  // ── FIX 4: derives profile from historical trend ──────────────────────────

  private deriveProfile(userId: string): LearnedProfile {
    // Verbosity — whichever has more occurrences prevails
    const highCount = this.getPatternCount(userId, "verbosity_high");
    const lowCount  = this.getPatternCount(userId, "verbosity_low");
    let verbosity: LearnedProfile["verbosity"] = "neutral";
    if (highCount > lowCount + 2) verbosity = "high";
    else if (lowCount > highCount + 2) verbosity = "low";

    // Style
    const formalCount = this.getPatternCount(userId, "style_formal");
    const casualCount = this.getPatternCount(userId, "style_casual");
    let style: LearnedProfile["style"] = "neutral";
    if (formalCount > casualCount + 2) style = "formal";
    else if (casualCount > formalCount + 2) style = "casual";

    // Topics of interest
    const topics: string[] = [];
    if (this.getPatternCount(userId, "topic_tech") > 3) topics.push("technology");
    if (this.getPatternCount(userId, "topic_ai")   > 3) topics.push("artificial intelligence");

    // Frequent question types
    const questionTypes: string[] = [];
    if (this.getPatternCount(userId, "question_how") > 2) questionTypes.push("how to");
    if (this.getPatternCount(userId, "question_why") > 2) questionTypes.push("why");

    // Peak hours — top 3 hours with most activity
    const hourCounts: { hour: number; count: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const count = this.getPatternCount(userId, `hour_${h}`);
      if (count > 0) hourCounts.push({ hour: h, count });
    }
    const peakHours = hourCounts
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(h => h.hour);

    return { verbosity, style, topics, peakHours, questionTypes };
  }

  // ── FIX 5: integration with self_model ────────────────────────────────────

  private updateSelfModel(userId: string, profile: LearnedProfile): void {
    const parts: string[] = [];

    if (profile.verbosity !== "neutral") {
      parts.push(`prefers ${profile.verbosity === "high" ? "detailed" : "short and direct"} responses`);
    }
    if (profile.style !== "neutral") {
      parts.push(`${profile.style === "formal" ? "formal" : "casual"} tone`);
    }
    if (profile.topics.length > 0) {
      parts.push(`interested in: ${profile.topics.join(", ")}`);
    }
    if (profile.peakHours.length > 0) {
      parts.push(`most active at ${profile.peakHours.join("h, ")}h`);
    }

    if (parts.length > 0) {
      selfModel.updateBelief(
        `sobre_usuario_${userId}`,
        parts.join(" | ")
      );
    }
  }

  /**
   * Returns the current learned profile — useful for PlanningAgent and PersonalityAgent.
   */
  public getLearnedProfile(userId: string): LearnedProfile {
    return this.deriveProfile(userId);
  }
}

export const incrementalLearn = new IncrementalLearn();
