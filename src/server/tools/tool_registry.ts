import { profileManager } from "../users/profile_manager";

export interface Tool {
  name: string;
  description: string;
  execute: (args: any) => Promise<string>;
}

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  public register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAllToolsDesc(): string {
    return Array.from(this.tools.values())
      .map(t => `- ${t.name}: ${t.description}`)
      .join("\\n");
  }
}

export const toolRegistry = new ToolRegistry();

// Ferramentas de Rede e Sistema
toolRegistry.register({
  name: "get_current_time",
  description: "Retorna a hora e a data atual do servidor real.",
  execute: async () => {
    return `Tempo atual do sistema local: ${new Date().toLocaleString('pt-BR')}`;
  }
});

toolRegistry.register({
  name: "web_search",
  description: "Busca informações na internet fictícia/simulada. (ex: { query: 'notícias' })",
  execute: async (args: any) => {
    console.log(`[Tool: WebSearch] Simulando busca por: ${args?.query}`);
    return `SISTEMA OFFLINE: Acesso em sandbox limitado. Sem acesso à rede para o termo: '${args?.query}'.`;
  }
});

// Ferramenta de Modificação Sistêmica do Perfil Interno
toolRegistry.register({
  name: "update_preferences",
  description: "Atualiza as preferências sistêmicas do usuário. Aceita 'user_id' e um dict 'preferences' (ex: {theme: 'light', verbosity: 'low', mode: 'stealth'}).",
  execute: async (args: any) => {
    try {
      const uid = args?.user_id || "admin_1";
      profileManager.updatePreferences(uid, args.preferences || {});
      return `Preferências do usuário ${uid} atualizadas no kernel para: ${JSON.stringify(args.preferences)}`;
    } catch (e) {
      return `Falha ao tentar modificar perfil: ${e}`;
    }
  }
});
