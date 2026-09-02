import { BaseAgent } from "./base_agent";
import { blackboard } from "../blackboard";
import { llmClient } from "../../utils/llm_client";
import { selfModel } from "../../psychology/self_model";

export class PlanningAgent extends BaseAgent {
  public readonly name = "PlanningAgent";

  constructor(private userId: string) {
    super();
  }

  public async execute(): Promise<void> {
    console.log(`[${this.name}] Formulando plano para user=${this.userId}...`);

    const userInput = blackboard.read("current_input");
    const rawContext: string[] = blackboard.read("retrieved_context") || [];

    // FIX 3: filters dreams and consolidations — they are not user facts
    // The LLM must not use internal reflections as if they were real episodes
    const context = rawContext.filter(m =>
      !m.startsWith("[SONHO/DEVANEIO]") &&
      !m.startsWith("[CONSOLIDAÇÃO NEURAL]")
    );

    // Consolidations enter separately as base context — not as episodes
    const consolidations = rawContext.filter(m =>
      m.startsWith("[CONSOLIDAÇÃO NEURAL]")
    );

    const systemInstruction = `You are the planning submodule of the cognitive engine.
Below is the system consciousness that defines WHO you are and WHAT you can do:
${selfModel.getPromptContext()}

Instruction: Respond objectively to the user's command, using the real episodes provided.
Do not produce canned responses from generic assistants.`;

    const prompt = `
${consolidations.length > 0 ? `Consolidated history summary (base context):
${consolidations.join("\n")}

` : ""}${context.length > 0 ? `Recent real episodes about the user:
${context.join("\n")}

` : "No prior relevant episodes for this query."}

User input:
"${userInput}"

Generate an objective draft of how to respond, based on the real episodes above.
Do not mix internal reflections or metaphors with user facts.
`;

    let draftedResponse = "";
    try {
      draftedResponse = await llmClient.generateText(prompt, systemInstruction);
    } catch (e: any) {
      console.error(`[${this.name}] Erro no motor cognitivo:`, e.message || e);
      draftedResponse = `An error occurred while generating the plan. Error: ${e.message || "Unknown"}.`;
    }

    blackboard.write("execution_plan", ["1. Context filtered and analyzed."]);
    blackboard.write("draft_response", draftedResponse);

    console.log(`[${this.name}] Rascunho gerado com ${context.length} episódios reais (${rawContext.length - context.length} reflexões filtradas).`);
  }
}
