import { BaseAgent } from "./base_agent";
import { blackboard } from "../blackboard";
import { llmClient } from "../../utils/llm_client";
import { toolRegistry } from "../../tools/tool_registry";

export class ActionAgent extends BaseAgent {
  public readonly name = "ActionAgent";
  private _userId: string;

  constructor(userId: string) {
    super();
    this._userId = userId;
  }

  public async execute(): Promise<void> {
    console.log(`[${this.name}] Checking whether real-world tools need to be called...`);

    const draft = blackboard.read("draft_response") || "";
    const user_input = blackboard.read("current_input") || "";

    // We instruct the LLM to act as an action router.
    const systemInstruction = `You are the Action Agent of Phoenix V2.
Your mission is to evaluate whether the user's question/message requires fetching real-world information absent from memory, or acting using a system tool.
Available operating system tools:
${toolRegistry.getAllToolsDesc()}

If you DETERMINE that you NEED to use a tool to answer accurately (for example, knowing today's date), respond ONLY AND EXACTLY in valid JSON format:
{"tool": "tool_name", "args": {"query": "argument if any"}}

If there is NO need for external tools or if you can already answer from memory alone, respond ONLY: NONE`;

    const prompt = `Entrada original: "${user_input}"
Rascunho atual da resposta: "${draft}"`;

    try {
      const decisionRaw = await llmClient.generateText(prompt, systemInstruction);
      let cleaned = decisionRaw.replace(/```json/g, "").replace(/```/g, "").trim();

      if (cleaned !== "NONE" && cleaned.startsWith("{")) {
        const parsed = JSON.parse(cleaned);
        if (parsed.tool) {
          const tool = toolRegistry.getTool(parsed.tool);
          if (tool) {
             console.log(`[${this.name}] Invocando protocolo de rede/sistema: ${parsed.tool}...`);
             const result = await tool.execute(parsed.args || {});
             blackboard.write("tool_results", `Resultado do protocolo ${parsed.tool}: ${result}`);
             
             // Updates the previous draft to incorporate the new tool information
             const newDraftPrompt = `Old draft: ${draft}
New information acquired from system: ${result}

Incorporate the new information and correct/improve the draft. Return ONLY the new base text draft, without external formatting or JSON.`;
             const updatedDraft = await llmClient.generateText(newDraftPrompt, "Update the old draft using the live system fact.");
             blackboard.write("draft_response", updatedDraft);
             console.log(`[${this.name}] Ferramenta finalizada e rascunho atualizado com os dados do mundo real.`);
          }
        }
      } else {
        console.log(`[${this.name}] No tools needed for this interaction.`);
      }
    } catch (error) {
      console.log(`[${this.name}] JSON parsing engine failed or decision aborted. Proceeding without tools.`);
    }
  }
}
