import { blackboard } from "../core/blackboard";
import { config } from "../config/settings";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// ── PAD Model (Pleasure-Arousal-Dominance) ───────────────────────────────────
// Replaces 6 discrete states with continuous numerical vectors.
// Far more expressive — allows mixed states and smooth transitions.
//
//   valence   (pleasure):  0.0 = very negative   →  1.0 = very positive
//   arousal   (activation):0.0 = calm/lethargic  →  1.0 = excited/agitated
//   dominance (control):   0.0 = submissive      →  1.0 = assertive/confident

export interface PADState {
  valence: number;
  arousal: number;
  dominance: number;
}

// Neutral base state for Phoenix — natural equilibrium point
const BASELINE: PADState = { valence: 0.65, arousal: 0.45, dominance: 0.55 };
const DECAY_RATE = 0.05;       // speed of return to baseline per turn
const IMPACT_SCALE = 0.15;     // how much an event can shift the state

// Readable labels derived from PAD — used in PersonalityAgent
export type EmotionLabel =
  | "animada"
  | "tranquila"
  | "tensa"
  | "introspectiva"
  | "focada"
  | "cansada"
  | "curiosa"
  | "preocupada"
  | "neutra";

export class EmotionEngine {
  private pad: PADState = { ...BASELINE };
  private energyLevel: number = 100;
  private db: Database.Database;

  constructor() {
    this.db = this.initDB();
    this.load();   // ← FIX 1: loads persisted state on startup
  }

  // ── Database ────────────────────────────────────────────────────────────────

  private initDB(): Database.Database {
    const dataDir = path.join(process.cwd(), ".data", "vault");
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    const db = new Database(path.join(dataDir, "phoenix_neural_db.sqlite"));
    db.exec(`
      CREATE TABLE IF NOT EXISTS emotion_state (
        userId    TEXT PRIMARY KEY,
        valence   REAL NOT NULL,
        arousal   REAL NOT NULL,
        dominance REAL NOT NULL,
        energy    REAL NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
    return db;
  }

  private load(userId: string = "default_user"): void {
    const row = this.db
      .prepare(`SELECT * FROM emotion_state WHERE userId = ?`)
      .get(userId) as any;

    if (row) {
      this.pad = { valence: row.valence, arousal: row.arousal, dominance: row.dominance };
      this.energyLevel = row.energy;
      console.log(`[Emotion] State restored: ${this.label()} | Energy: ${this.energyLevel.toFixed(1)}%`);
    } else {
      this.pad = { ...BASELINE };
      this.energyLevel = 100;
    }
  }

  private save(userId: string = "default_user"): void {
    this.db.prepare(`
      INSERT INTO emotion_state (userId, valence, arousal, dominance, energy, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(userId) DO UPDATE SET
        valence=excluded.valence,
        arousal=excluded.arousal,
        dominance=excluded.dominance,
        energy=excluded.energy,
        updatedAt=excluded.updatedAt
    `).run(
      userId,
      this.pad.valence,
      this.pad.arousal,
      this.pad.dominance,
      this.energyLevel,
      Date.now()
    );
  }

  // ── Interaction evaluation ──────────────────────────────────────────────────

  public evaluateInteraction(
    userInput: string,
    processingTimeMs: number,
    userId: string = "default_user"
  ): void {
    if (!config.emotionEnabled) return;

    // Energy decays with effort
    const effort = (userInput.length * 0.05) + (processingTimeMs * 0.001);
    this.energyLevel = Math.max(0, this.energyLevel - effort);

    // FIX 3: contextual detection — analyzes context before isolated words
    const deltas = this.inferDeltas(userInput);
    this.applyDeltas(deltas);

    // Low energy pulls valence and dominance down
    if (this.energyLevel < 20) {
      this.pad.valence   = Math.max(0, this.pad.valence   - 0.05);
      this.pad.dominance = Math.max(0, this.pad.dominance - 0.05);
    }

    blackboard.write("current_emotion", this.label());
    blackboard.write("pad_state", this.pad);
    blackboard.write("energy_level", this.energyLevel);

    // FIX 1: persists after each interaction
    this.save(userId);

    console.log(
      `[Emotion] ${this.label()} | ` +
      `V:${this.pad.valence.toFixed(2)} A:${this.pad.arousal.toFixed(2)} D:${this.pad.dominance.toFixed(2)} | ` +
      `Energia: ${this.energyLevel.toFixed(1)}%`
    );
  }

  // ── FIX 3: contextual inference (no longer isolated keywords) ───────────────

  private inferDeltas(text: string): Partial<PADState> {
    const t = text.toLowerCase();
    const delta: Partial<PADState> = {};

    // Positive context — valence rises
    const positivePatterns = [
      /obrigad[oa]/,
      /muito (bom|legal|ótimo|top|incrível)/,
      /adorei|gostei|perfeito|excelente/,
      /que (bom|ótimo|legal)/,
    ];
    if (positivePatterns.some(p => p.test(t))) {
      delta.valence = 0.3;
      delta.arousal = 0.1;
    }

    // Negative context — valence falls, arousal rises
    const negativePatterns = [
      /não (funcionou|gostei|entendi)/,
      /tá errado|está errado/,
      /(muito )?frustrad[oa]/,
      /que (problema|droga|chato)/,
    ];
    if (negativePatterns.some(p => p.test(t))) {
      delta.valence   = -0.3;
      delta.arousal   =  0.2;
      delta.dominance = -0.1;
    }

    // Curiosity — arousal rises, dominance falls slightly
    const curiosityPatterns = [
      /como (funciona|é que|assim)/,
      /por que|por quê/,
      /me explica|pode explicar/,
      /o que (é|são|significa)/,
    ];
    if (curiosityPatterns.some(p => p.test(t))) {
      delta.arousal   = 0.2;
      delta.dominance = -0.05;
    }

    // Urgency — arousal and dominance rise
    const urgencyPatterns = [
      /urgente|rápido|agora/,
      /preciso (muito|urgente)/,
      /não pode esperar/,
    ];
    if (urgencyPatterns.some(p => p.test(t))) {
      delta.arousal   = 0.3;
      delta.dominance = 0.2;
    }

    return delta;
  }

  private applyDeltas(deltas: Partial<PADState>): void {
    for (const dim of ["valence", "arousal", "dominance"] as (keyof PADState)[]) {
      const delta = (deltas[dim] ?? 0) * IMPACT_SCALE;
      const base  = BASELINE[dim];
      // Applies delta and decays toward baseline
      let val = this.pad[dim] + delta;
      val = val + (base - val) * DECAY_RATE;
      this.pad[dim] = Math.round(Math.max(0, Math.min(1, val)) * 1000) / 1000;
    }
  }

  // ── FIX 2: rest() persists the recovery ──────────────────────────────────────

  public rest(userId: string = "default_user"): void {
    this.energyLevel = Math.min(100, this.energyLevel + 15);

    // Emotional recovery toward baseline during rest
    for (const dim of ["valence", "arousal", "dominance"] as (keyof PADState)[]) {
      this.pad[dim] = Math.round(
        (this.pad[dim] + (BASELINE[dim] - this.pad[dim]) * 0.1) * 1000
      ) / 1000;
    }

    // FIX 2: saves rest to the database — not lost on restart
    this.save(userId);

    console.log(`[Emotion] Rest → ${this.label()} | Energy: ${this.energyLevel.toFixed(1)}%`);
  }

  // ── FIX 4: label derived from PAD vector ──────────────────────────────────────

  public label(): EmotionLabel {
    const { valence: v, arousal: a, dominance: d } = this.pad;

    if (this.energyLevel < 20)       return "cansada";
    if (v > 0.7 && a > 0.6)          return "animada";
    if (v > 0.7 && a <= 0.6)         return "tranquila";
    if (v > 0.5 && a > 0.6 && d < 0.4) return "curiosa";
    if (v < 0.4 && a > 0.6)          return "tensa";
    if (v < 0.4 && a <= 0.5)         return "introspectiva";
    if (v < 0.45 && a > 0.5)         return "preocupada";
    if (a > 0.55 && d > 0.55)        return "focada";
    return "neutra";
  }

  public getStatus(): { state: EmotionLabel; energy: number; pad: PADState } {
    return {
      state:  this.label(),
      energy: Math.round(this.energyLevel),
      pad:    { ...this.pad },   // exposes the full vector for anyone who wants it
    };
  }

  public getPAD(): PADState {
    return { ...this.pad };
  }
}

export const emotionEngine = new EmotionEngine();
