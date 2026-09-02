import { BaseAgent } from "./base_agent";
import { blackboard } from "../blackboard";
import { memoryManager } from "../../memory/memory_manager";

/**
 * Padrões para extração de fatos pessoais do texto do usuário.
 * Quando detectados, são gravados com importância alta (9)
 * como fatos estruturados — não como texto bruto.
 */
const FACT_PATTERNS: { pattern: RegExp; key: string }[] = [
  { pattern: /meu nome é ([^\.,!?]+)/i,          key: "nome_usuario" },
  { pattern: /me chamo ([^\.,!?]+)/i,             key: "nome_usuario" },
  { pattern: /pode me chamar de ([^\.,!?]+)/i,    key: "nome_usuario" },
  { pattern: /nasci em ([^\.,!?]+)/i,             key: "cidade_nascimento" },
  { pattern: /sou de ([^\.,!?]+)/i,               key: "cidade_origem" },
  { pattern: /moro em ([^\.,!?]+)/i,              key: "cidade_atual" },
  { pattern: /trabalho (?:com|em|como) ([^\.,!?]+)/i, key: "profissao" },
  { pattern: /gosto de ([^\.,!?]+)/i,             key: "gosto" },
  { pattern: /adoro ([^\.,!?]+)/i,                key: "adora" },
  { pattern: /meu hobby é ([^\.,!?]+)/i,          key: "hobby" },
  { pattern: /meus hobbies são ([^\.,!?]+)/i,     key: "hobbies" },
  { pattern: /tenho (\d+) anos/i,                 key: "idade" },
];

export class MemoryAgent extends BaseAgent {
  public readonly name = "MemoryAgent";

  // ── CORRIGIDO: recebe userId no construtor ────────────────────────────────
  constructor(private userId: string) {
    super();
  }

  public async execute(): Promise<void> {
    console.log(`[${this.name}] Buscando memórias relevantes para user=${this.userId}...`);

    const userInput = blackboard.read("current_input") as string;

    // 1. Busca memórias relevantes para o input atual
    const retrievedMemories = await memoryManager.retrieveRelevantContext(this.userId, userInput);

    if (retrievedMemories.length === 0) {
      blackboard.write("retrieved_context", ["Nenhuma memória passada relevante."]);
    } else {
      blackboard.write("retrieved_context", retrievedMemories);
      console.log(`[${this.name}] ${retrievedMemories.length} memórias recuperadas.`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // 2. CORREÇÃO CRÍTICA: extrai fatos estruturados do input
    //    Em vez de gravar só "Usuário disse: ...", identifica informações
    //    pessoais e as salva com chave clara e importância alta.
    // ─────────────────────────────────────────────────────────────────────
    const factsExtracted = await this.extractAndStoreFacts(userInput);

    // 3. Grava o input bruto também — mas só se não for informação já estruturada
    //    (evita duplicar o mesmo dado como fato E como texto bruto)
    if (!factsExtracted) {
      await memoryManager.storeMemory(
        this.userId,
        `Usuário disse: "${userInput}"`,
        4   // importância média para inputs genéricos
      );
    }

    console.log(`[${this.name}] Contexto injetado no blackboard.`);
  }

  /**
   * Tenta extrair fatos pessoais do texto usando padrões definidos.
   * Se encontrar algo, grava com importância 9 (alta) e chave estruturada.
   * Retorna true se ao menos um fato foi extraído.
   */
  private async extractAndStoreFacts(text: string): Promise<boolean> {
    let foundAny = false;

    for (const { pattern, key } of FACT_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const value = match[1].trim();

        // Grava como fato estruturado com importância máxima
        await memoryManager.storeMemory(
          this.userId,
          `FATO_PESSOAL | ${key}: ${value}`,
          9   // importância alta — fatos pessoais nunca devem ser esquecidos
        );

        console.log(`[${this.name}] Fato extraído → ${key}: "${value}"`);
        foundAny = true;
      }
    }

    // Se encontrou fatos MAS o input tem conteúdo além deles,
    // grava o input completo também para contexto semântico
    if (foundAny && text.length > 60) {
      await memoryManager.storeMemory(
        this.userId,
        `Usuário disse: "${text}"`,
        5
      );
    }

    return foundAny;
  }
}

