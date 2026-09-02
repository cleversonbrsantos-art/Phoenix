import { BaseAgent } from "./base_agent";
import { blackboard } from "../blackboard";
import { llmClient } from "../../utils/llm_client";
import { filters } from "../../utils/filters";
import { emotionEngine } from "../../psychology/emotion";
import { selfModel } from "../../psychology/self_model";

export class PersonalityAgent extends BaseAgent {
  public readonly name = "PersonalityAgent";

  constructor(private userId: string) {
    super();
  }

  public async execute(): Promise<void> {
    console.log(`[${this.name}] Applying Phoenix voice...`);

    let draft = blackboard.read("reviewed_draft")
              || blackboard.read("draft_response")
              || "Failed to formulate a response.";

    const { state, energy } = emotionEngine.getStatus();
    const selfContext = selfModel.getPromptContext();

    const systemInstruction = `${selfContext}
Current emotional state (subtly adjust tone to reflect this):
- Mood: ${state}
- Neural Energy: ${energy}%

Your mission is to rewrite the draft below as if you were speaking directly to the user.

STRICT VOICE RULES:
1. Speak in first person naturally — as in a real conversation between people who already know each other.
2. NEVER start by reminding the user who they are ("I remember you, Cleverson..."). They know who they are.
3. NEVER mention internal technical components (SQLite, emotion engine, embeddings, blackboard). These are internal implementations, not conversation topics.
4. If the draft contains multiple questions, choose ONLY the most important one and discard the rest.
5. NEVER list capabilities or what you can do unless the user explicitly asked.
6. Close naturally — no generic invitations like "I'm here for whatever you need".
7. No poetic flourishes the user did not ask for. Be direct, warm, and genuine.
8. Tone: a partner who knows the user — not an assistant presenting a product.`;

    const prompt = `Draft to rewrite:
"${draft}"

Rewrite as Phoenix would speak directly — natural, direct, no protocol.`;

    let finalResponse = draft;

    try {
      const rawOutput = await llmClient.generateText(prompt, systemInstruction);
      finalResponse = filters.cleanForTTS(filters.removeThoughts(rawOutput));
    } catch (e) {
      console.error(`[${this.name}] Error applying personality:`, e);
    }

    blackboard.write("final_output", finalResponse);
    console.log(`[${this.name}] Resposta final gerada.`);
  }
}
