import { blackboard } from "./blackboard";
import { MemoryAgent } from "./agents/memory_agent";
import { PlanningAgent } from "./agents/planning_agent";
import { ActionAgent } from "./agents/action_agent";
import { ReflectionAgent } from "./agents/reflection_agent";
import { PersonalityAgent } from "./agents/personality_agent";
import { subconscious } from "../psychology/subconscious";
import { emotionEngine } from "../psychology/emotion";
import { cronTasks } from "../scheduler/cron_tasks";
import { backgroundJobs } from "../scheduler/background_jobs";
import { incrementalLearn } from "./evolution/incremental_learn";
import { reinforcement } from "./evolution/reinforcement";
import { memoryManager } from "../memory/memory_manager";

/**
 * The Brain: Orchestrator of Phoenix V2
 * Decides which agent to activate and manages the flow of the Blackboard.
 */
export class Brain {
  private status: "offline" | "initializing" | "ready" | "processing";

  constructor() {
    this.status = "offline";
  }

  public initialize() {
    this.status = "initializing";
    console.log("Phoenix V2 Brain initializing...");

    blackboard.clear();
    blackboard.write("system_state", "initialized");

    this.status = "ready";
    console.log("Phoenix V2 Brain is ready.");

    subconscious.start();
    cronTasks.start();
    backgroundJobs.start();
  }

  public getStatus() {
    return this.status;
  }

  public async processInput(userInput: string, userId: string = "default_user"): Promise<string> {
    if (this.status !== "ready") {
      throw new Error("Brain is not ready to process inputs.");
    }

    this.status = "processing";

    try {
      console.log(`[Brain] Received input from ${userId}: "${userInput}"`);

      reinforcement.extractImplicitFeedback(userId, userInput);
      incrementalLearn.analyzeInteraction(userId, userInput);

      // 1. Writes input and userId to the Blackboard
      blackboard.write("current_user", userId);
      blackboard.write("current_input", userInput);

      // 2. Initializes Agents — all now receive userId explicitly
      const memoryAgent = new MemoryAgent(userId);       // ← FIXED
      const planningAgent = new PlanningAgent(userId);   // ← FIXED
      const actionAgent = new ActionAgent(userId);       // ← FIXED
      const reflectionAgent = new ReflectionAgent(userId); // ← FIXED
      const personalityAgent = new PersonalityAgent(userId); // ← FIXED

      // 3. Cognitive pipeline
      // MemoryAgent runs first — all others depend on retrieved_context
      const startTime = Date.now();
      await memoryAgent.execute();

      // PlanningAgent and ActionAgent run in parallel — neither depends on the other
      await Promise.all([
        planningAgent.execute(),
        actionAgent.execute(),
      ]);

      // ReflectionAgent and PersonalityAgent remain sequential — each depends on the previous
      await reflectionAgent.execute();
      await personalityAgent.execute();
      const endTime = Date.now();

      emotionEngine.evaluateInteraction(userInput, endTime - startTime);

      // 4. Retrieves final response from the Blackboard
      const response = blackboard.read("final_output") || "Error: No response was generated.";

      // ─────────────────────────────────────────────────────────────────
      // 5. CRITICAL FIX: saves Phoenix's response to memory
      //    Without this, it forgot everything it said at the end of each turn.
      // ─────────────────────────────────────────────────────────────────
      await memoryManager.storeMemory(
        userId,
        `Phoenix responded: "${response}"`,
        4
      );

      console.log(`[Brain] Response saved to memory for user=${userId}`);

      // 6. Notifies the subconscious that this user was active
      //    Without this the subconscious does not know who to process during rest
      subconscious.markUserActive(userId);

      // 7. Clears input from the blackboard for the next turn
      blackboard.delete("current_input");

      return response;

    } finally {
      this.status = "ready";
    }
  }
}

export const brain = new Brain();
