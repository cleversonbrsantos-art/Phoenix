import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export interface MemoryRecord {
  id: string;
  userId: string;
  content: string;
  timestamp: number;
  importance: number; // 1 to 10
  vector?: number[];
}

/**
 * Storage Layer
 * Technical interface with the SQLite database.
 *
 * CHANGE: added removeMemory() for safe individual removal.
 * The destructive saveMemories() was kept but must not be used for
 * consolidation — use addMemory() + removeMemory() individually.
 */
export class Storage {
  private db: Database.Database;

  constructor() {
    const dataDir = path.join(process.cwd(), ".data", "vault");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(path.join(dataDir, "phoenix_neural_db.sqlite"));
    this.initializeSchema();
    this.migrateLegacyData();
  }

  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id         TEXT    PRIMARY KEY,
        userId     TEXT    NOT NULL,
        content    TEXT    NOT NULL,
        timestamp  INTEGER NOT NULL,
        importance INTEGER NOT NULL,
        vector     TEXT
      );
    `);

    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_userId    ON memories(userId);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_timestamp ON memories(timestamp);`);
  }

  private migrateLegacyData(): void {
    const legacyDir = path.join(process.cwd(), ".data", "users", "individual_storage");
    if (!fs.existsSync(legacyDir)) return;

    try {
      const files = fs.readdirSync(legacyDir);
      for (const file of files) {
        if (!file.endsWith("_memory.json")) continue;
        const filePath = path.join(legacyDir, file);
        const data = fs.readFileSync(filePath, "utf-8");
        const memories = JSON.parse(data) as MemoryRecord[];

        for (const m of memories) {
          const exists = this.db
            .prepare(`SELECT 1 FROM memories WHERE id = ?`)
            .get(m.id);
          if (!exists) {
            this.addMemory(m.userId, m);
          }
        }

        fs.renameSync(filePath, filePath + ".migrated");
        console.log(`[Storage] Legacy migration complete: ${file}`);
      }
    } catch (e) {
      console.warn("[Storage] Error during legacy data migration:", e);
    }
  }

  // ── Read ─────────────────────────────────────────────────────────────────────

  public loadMemories(userId: string): MemoryRecord[] {
    const rows = this.db
      .prepare(`SELECT * FROM memories WHERE userId = ? ORDER BY timestamp ASC`)
      .all(userId) as any[];

    return rows.map(row => ({
      ...row,
      vector: row.vector ? JSON.parse(row.vector) : undefined,
    }));
  }

  // ── Write ────────────────────────────────────────────────────────────────────

  public addMemory(userId: string, memory: MemoryRecord): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO memories (id, userId, content, timestamp, importance, vector)
      VALUES (@id, @userId, @content, @timestamp, @importance, @vector)
    `).run({
      id:         memory.id,
      userId:     memory.userId,
      content:    memory.content,
      timestamp:  memory.timestamp,
      importance: memory.importance,
      vector:     memory.vector ? JSON.stringify(memory.vector) : null,
    });
  }

  /**
   * Removes a specific memory by id.
   * Used by ConsolidationEngine for safe, incremental removal —
   * no risk of accidentally erasing the entire database.
   */
  public removeMemory(userId: string, memoryId: string): void {
    this.db
      .prepare(`DELETE FROM memories WHERE id = ? AND userId = ?`)
      .run(memoryId, userId);
  }

  /**
   * Replaces ALL of a user's memories at once.
   * WARNING: destructive operation — use only when certain
   * the list is complete. Prefer addMemory + removeMemory.
   */
  public saveMemories(userId: string, memories: MemoryRecord[]): void {
    const deleteStmt = this.db.prepare(`DELETE FROM memories WHERE userId = ?`);
    const insertStmt = this.db.prepare(`
      INSERT INTO memories (id, userId, content, timestamp, importance, vector)
      VALUES (@id, @userId, @content, @timestamp, @importance, @vector)
    `);

    const transaction = this.db.transaction((uid: string, mems: MemoryRecord[]) => {
      deleteStmt.run(uid);
      for (const m of mems) {
        insertStmt.run({
          id:         m.id,
          userId:     m.userId,
          content:    m.content,
          timestamp:  m.timestamp,
          importance: m.importance,
          vector:     m.vector ? JSON.stringify(m.vector) : null,
        });
      }
    });

    transaction(userId, memories);
  }
}

export const storage = new Storage();
