import { MemoryRecord } from "./storage";

/**
 * PriorityManager — Algoritmo de relevância de memórias.
 *
 * Score final = Importância × Recência × Bônus de Acesso
 *
 * Correções aplicadas:
 *   1. Decaimento proporcional à importância — fatos críticos quase não decaem
 *   2. Curva exponencial (Lei de Ebbinghaus) — mais realista que linear
 *   3. Memórias consolidadas tratadas como base fixa — não competem no ranking normal
 *   4. Bônus de acesso — memórias frequentemente acessadas sobem no ranking
 */
export class PriorityManager {

  /**
   * Calcula o score de relevância de uma memória.
   * Retorna um número positivo — quanto maior, mais relevante.
   */
  public static calculateRelevance(memory: MemoryRecord, currentTime: number): number {

    // CORREÇÃO 3: memórias consolidadas têm score fixo alto
    // Não decaem — são a base de conhecimento permanente
    if (memory.content.startsWith("[CONSOLIDAÇÃO NEURAL]")) {
      return memory.importance * 0.9;   // score alto e estável
    }

    const ageInHours = (currentTime - memory.timestamp) / (1000 * 60 * 60);

    // CORREÇÃO 1 e 2: taxa de decaimento inversamente proporcional à importância
    // Importância 10 → decai 0.2% por hora (quase nada)
    // Importância 5  → decai 2.0% por hora (moderado)
    // Importância 1  → decai 8.0% por hora (rápido)
    //
    // Fórmula: decayRate = 0.1 / importância  (quanto maior a importância, menor a taxa)
    const decayRate = 0.1 / memory.importance;

    // CORREÇÃO 2: decaimento exponencial — queda rápida no início, estabilização depois
    // Nunca chega a zero — base mínima de 0.05 para memórias muito antigas
    const recencyWeight = Math.max(0.05, Math.exp(-decayRate * ageInHours));

    // CORREÇÃO 4: bônus de acesso
    // Cada acesso adiciona 2% ao score, com teto em 30%
    // (access_count pode não existir em registros antigos — fallback para 0)
    const accessCount  = (memory as any).access_count ?? 0;
    const accessBonus  = Math.min(0.30, accessCount * 0.02);

    // Score final
    const score = memory.importance * recencyWeight * (1 + accessBonus);

    return Math.round(score * 1000) / 1000;   // 3 casas decimais
  }

  /**
   * Ordena uma lista de memórias da mais para a menos relevante.
   */
  public static rankMemories(
    memories: MemoryRecord[],
    currentTime: number = Date.now()
  ): MemoryRecord[] {
    return [...memories].sort(
      (a, b) =>
        PriorityManager.calculateRelevance(b, currentTime) -
        PriorityManager.calculateRelevance(a, currentTime)
    );
  }

  /**
   * Filtra e retorna as top-K memórias mais relevantes.
   * Consolidações são sempre incluídas independente do K.
   */
  public static getTopK(
    memories: MemoryRecord[],
    k: number,
    currentTime: number = Date.now()
  ): MemoryRecord[] {
    // Separa consolidações — sempre entram
    const consolidated = memories.filter(m =>
      m.content.startsWith("[CONSOLIDAÇÃO NEURAL]")
    );

    // Demais memórias rankeadas por score
    const regular = memories
      .filter(m => !m.content.startsWith("[CONSOLIDAÇÃO NEURAL]"))
      .map(m => ({
        memory: m,
        score:  PriorityManager.calculateRelevance(m, currentTime),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, k - consolidated.length))
      .map(s => s.memory);

    return [...consolidated, ...regular];
  }
}