export interface BlackboardEntry {
  key: string;
  value: any;
  timestamp: number;
}

/**
 * Blackboard Pattern
 * Shared short-term memory / active state.
 * Allows different agents to read and write to a common workspace.
 */
export class Blackboard {
  private memory: Map<string, BlackboardEntry>;

  constructor() {
    this.memory = new Map();
  }

  public write(key: string, value: any): void {
    this.memory.set(key, {
      key,
      value,
      timestamp: Date.now(),
    });
  }

  public read(key: string): any | null {
    const entry = this.memory.get(key);
    return entry ? entry.value : null;
  }

  public readAll(): Record<string, any> {
    const all: Record<string, any> = {};
    for (const [key, entry] of this.memory.entries()) {
      all[key] = entry.value;
    }
    return all;
  }

  public delete(key: string): void {
    this.memory.delete(key);
  }

  public clear(): void {
    this.memory.clear();
  }
}

export const blackboard = new Blackboard();
