import { selfModel } from "../../psychology/self_model";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

/**
 * ReinforcementEngine — Reinforcement learning.
 *
 * Fixes applied:
 *   1. Score persists in SQLite — does not vanish on restart
 *   2. Score influences self_model and real behavior
 *   3. Graduated feedback — not just +5 or -5
 *   4. Tracks WHAT was rated well/poorly by category
 *   5. Support for explicit user feedback
 *   6. Integration with self_model — reinforcements become beliefs
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type FeedbackCategory =
  | "memoria"       // feedback on whether it remembered something or not
  | "tom"           // feedback on the response style
  | "conteudo"      // feedback on information accuracy
  | "velocidade"    // feedback on conciseness
  | "geral";        // generic feedback without clear category

interface FeedbackRecord {
  userId:    string;
  reward:    number;
  category:  FeedbackCategory;
  context:   string;           // excerpt of the input that generated the feedback
  timestamp: number;
}

// ── Graduated feedback patterns ───────────────────────────────────────────────

const POSITIVE_PATTERNS: { pattern: RegExp; reward: number; category: FeedbackCategory }[] = [
  { pattern: /perfeito|excelente|incrível/i,         reward: 10, category: "geral" },
  { pattern: /muito bom|ótimo|adorei/i,              reward:  7, category: "geral" },
  { pattern: /bom|legal|gostei|certo/i,              reward:  4, category: "geral" },
  { pattern: /lembrou|se lembrou|guardou/i,          reward:  8, category: "memoria" },
  { pattern: /exatamente (isso|o que)/i,             reward:  6, category: "conteudo" },
  { pattern: /direto|objetivo|claro/i,               reward:  5, category: "velocidade" },
  { pattern: /carinhosa|atenciosa|parceira/i,        reward:  6, category: "tom" },
];

const NEGATIVE_PATTERNS: { pattern: RegExp; reward: number; category: FeedbackCategory }[] = [
  { pattern: /péssimo|horrível|terrível/i,           reward: -10, category: "geral" },
  { pattern: /errado|incorreto|não é isso/i,         reward:  -7, category: "conteudo" },
  { pattern: /não lembrou|esqueceu|não guardou/i,    reward:  -8, category: "memoria" },
  { pattern: /confuso|não entendi|não faz sentido/i, reward:  -5, category: "conteudo" },
  { pattern: /longo demais|enrolou|demorou/i,        reward:  -4, category: "velocidade" },
  { pattern: /frio|mecânico|sem emoção/i,            reward:  -5, category: "tom" },
  { pattern: /corrija|corrige|tá errado/i,           reward:  -6, category: "conteudo" },
];

export class ReinforcementEngine {
  private db: Database.Database;

  constructor() {
    this.db = this.initDB();
  }

  // ── Database ────────────────────────────────────────────────────────────────

  private initDB(): Database.Database {
    const dataDir = path.join(process.cwd(), ".data", "vault");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const db = new Database(path.join(dataDir, "phoenix_neural_db.sqlite"));

    // FIX 1: persistent feedback table
    db.exec(`
      CREATE TABLE IF NOT EXISTS reinforcement_log (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        userId    TEXT    NOT NULL,
        reward    REAL    NOT NULL,
        category  TEXT    NOT NULL,
        context   TEXT,
        timestamp INTEGER NOT NULL
      );
    `);

    // Accumulated score by category — for trend analysis
    db.exec(`
      CREATE TABLE IF NOT EXISTS reinforcement_scores (
        userId    TEXT    NOT NULL,
        category  TEXT    NOT NULL,
        score     REAL    DEFAULT 0,
        count     INTEGER DEFAULT 0,
        PRIMARY KEY (userId, category)
      );
    `);

    return db;
  }

  // ── Implicit feedback — detected automatically ──────────────────────────────

  public extractImplicitFeedback(userId: string, userInput: string): void {
    let detected = false;

    // Checks positive patterns
    for (const { pattern, reward, category } of POSITIVE_PATTERNS) {
      if (pattern.test(userInput)) {
        this.applyFeedback(userId, reward, category, userInput);
        detected = true;
        break;   // one feedback per input — avoids double-count
      }
    }

    if (detected) return;

    // Checks negative patterns
    for (const { pattern, reward, category } of NEGATIVE_PATTERNS) {
      if (pattern.test(userInput)) {
        this.applyFeedback(userId, reward, category, userInput);
        break;
      }
    }
  }

  // ── FIX 5: explicit user feedback ──────────────────────────────────────────

  public applyExplicitFeedback(
    userId: string,
    type: "positive" | "negative",
    category: FeedbackCategory = "geral",
    context: string = ""
  ): void {
    const reward = type === "positive" ? 8 : -8;
    this.applyFeedback(userId, reward, category, context);
    console.log(`[Reinforcement] Explicit feedback received: ${type} | category: ${category}`);
  }

  // ── Core: applies and persists the feedback ───────────────────────────────

  private applyFeedback(
    userId: string,
    reward: number,
    category: FeedbackCategory,
    context: string
  ): void {
    // FIX 1: persists to the database
    this.db.prepare(`
      INSERT INTO reinforcement_log (userId, reward, category, context, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, reward, category, context.substring(0, 200), Date.now());

    // Updates accumulated score by category
    this.db.prepare(`
      INSERT INTO reinforcement_scores (userId, category, score, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(userId, category) DO UPDATE SET
        score = score + excluded.score,
        count = count + 1
    `).run(userId, category, reward);

    const totalScore = this.getTotalScore(userId);
    console.log(
      `[Reinforcement] user=${userId} | reward=${reward > 0 ? "+" : ""}${reward} | ` +
      `categoria=${category} | score total=${totalScore.toFixed(1)}`
    );

    // FIX 2 and 6: influences self_model based on accumulated score
    this.updateSelfModelFromScores(userId);
  }

  // ── FIX 2 and 6: score influences real behavior ───────────────────────────

  private updateSelfModelFromScores(userId: string): void {
    const scores = this.getCategoryScores(userId);

    // Memory
    if (scores["memoria"] !== undefined) {
      const memScore = scores["memoria"];
      selfModel.updateBelief(
        "sobre_memoria_feedback",
        memScore > 10
          ? "user confirms memory is working well"
          : memScore < -5
          ? "user reported memory failures — attention required"
          : "memory with neutral evaluation"
      );
    }

    // Tone
    if (scores["tom"] !== undefined) {
      const tomScore = scores["tom"];
      selfModel.updateBelief(
        "sobre_tom_feedback",
        tomScore > 5
          ? "user appreciates the empathetic and caring tone"
          : tomScore < -3
          ? "user found the tone mechanical — adjust to be more natural"
          : "tone with neutral evaluation"
      );
    }

    // Content
    if (scores["conteudo"] !== undefined) {
      const contScore = scores["conteudo"];
      selfModel.updateBelief(
        "sobre_precisao_feedback",
        contScore > 10
          ? "technical responses well rated by the user"
          : contScore < -5
          ? "user identified inaccuracies — increase care with facts"
          : "accuracy with neutral evaluation"
      );
    }
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  public getTotalScore(userId: string): number {
    const row = this.db.prepare(`
      SELECT SUM(score) as total FROM reinforcement_scores WHERE userId = ?
    `).get(userId) as { total: number | null };
    return row?.total ?? 0;
  }

  public getCategoryScores(userId: string): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT category, score FROM reinforcement_scores WHERE userId = ?
    `).all(userId) as { category: string; score: number }[];

    return rows.reduce((acc, r) => {
      acc[r.category] = r.score;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Returns a performance summary — useful for the subconscious
   * to include in reflection and for debugging.
   */
  public getSummary(userId: string): string {
    const total  = this.getTotalScore(userId);
    const scores = this.getCategoryScores(userId);

    const categoryLines = Object.entries(scores)
      .map(([cat, score]) => `  ${cat}: ${score > 0 ? "+" : ""}${score.toFixed(1)}`)
      .join("\n");

    return (
      `Total score: ${total > 0 ? "+" : ""}${total.toFixed(1)}\n` +
      `By category:\n${categoryLines || "  (no feedback yet)"}`
    );
  }
}

export const reinforcement = new ReinforcementEngine();