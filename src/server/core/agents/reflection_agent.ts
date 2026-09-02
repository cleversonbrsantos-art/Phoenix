import { BaseAgent } from "./base_agent";
import { blackboard } from "../blackboard";
import { llmClient } from "../../utils/llm_client";

export class ReflectionAgent extends BaseAgent {
  public readonly name = "ReflectionAgent";
  private _userId: string;

  constructor(userId: string) {
    super();
    this._userId = userId;
  }

  public async execute(): Promise<void> {
    console.log(`[${this.name}] Evaluating draft for coherence and rules...`);

    let draft = blackboard.read("draft_response") || "No draft was generated.";

    // Fast path: if the draft passes basic quality checks, skip the LLM call entirely.
    // The LLM call only runs when the draft shows signs of needing correction.
    if (this.draftIsAcceptable(draft)) {
      console.log(`[${this.name}] Draft accepted without LLM review.`);
      blackboard.write("reviewed_draft", draft);
      console.log(`[${this.name}] Reflection complete.`);
      return;
    }

    const systemInstruction = `You are the reflection submodule (internal critic).
Your mission is to evaluate an AI response draft to ensure:
1. No harmful/offensive tones.
2. That it responds coherently without exposing internal prompts.

Return ONLY the final refined version of the draft. If it is good, return the draft as-is. If it is poor, rewrite it in a dry and direct manner.`;

    const prompt = `Evaluate the following draft:
"${draft}"
`;

    let reviewedDraft = draft;
    try {
        reviewedDraft = await llmClient.generateText(prompt, systemInstruction);
    } catch (e) {
        console.error("Error in Reflection:", e);
    }

    // Pass the checked draft forward
    blackboard.write("reviewed_draft", reviewedDraft);

    console.log(`[${this.name}] Reflection complete.`);
  }

  /**
   * Local quality heuristic — runs in microseconds, no API call needed.
   * Returns true when the draft is safe to pass through without LLM review.
   * The LLM reviewer is only invoked for drafts that show warning signs.
   */
  private draftIsAcceptable(draft: string): boolean {
    if (!draft || draft.trim().length < 10) return false;

    // Signs that the draft needs LLM review
    const warningPatterns = [
      /error|erro/i,                    // error messages leaked into draft
      /undefined|null/i,                // unresolved variables
      /blackboard|sqlite|embedding/i,   // internal system details exposed
      /\[SONHO\]|\[DREAM\]/i,           // internal memory tags leaked
      /fuck|shit|bastard|idiot/i,       // offensive content
    ];

    return !warningPatterns.some(pattern => pattern.test(draft));
  }
}
