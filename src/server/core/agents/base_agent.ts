import { blackboard } from "../blackboard";

export abstract class BaseAgent {
  public abstract readonly name: string;

  constructor() {}

  /**
   * Executes the agent's primary logic.
   * Agents read from and write to the shared blackboard.
   */
  public abstract execute(): Promise<void>;
}
