import express from "express";
import { storage } from "./storage";
import { PriorityManager } from "./priority";
import { embeddings } from "../utils/embeddings";

/**
 * Memory Manager (O Porteiro)
 * Decide o que vai para o HD e faz o resgate do que é relevante com base em vetores/prioridade.
 */
export class MemoryManager {
  /**
   * Resgata memórias baseadas no score de prioridade e recência.
   * Obs: No futuro, a busca semântica do 'utils/embeddings.ts' será acionada aqui
   * para combinar (Score de Prioridade + Similaridade Semântica).
   */
  public async retrieveRelevantContext(userId: string, query: string): Promise<string[]> {
    const memories = storage.loadMemories(userId);
    const now = Date.now();
    
    if (memories.length === 0) return [];

    // Busca de vetor da query baseada nas palavras-chave atuais do usuário
    let queryVector: number[] = [];
    try {
      queryVector = await embeddings.generateEmbedding(query);
    } catch (e) {
      console.warn("[MemoryManager] Fallback na geração de embedding, usando recência/prioridade base.");
    }

    // Calcula o rank das memórias mesclando IA semântica + Importância temporal
    const scoredMemories = memories.map(m => {
      let priorityScore = PriorityManager.calculateRelevance(m, now);
      let semanticScore = 0;
      
      if (queryVector.length > 0 && m.vector && m.vector.length > 0) {
        semanticScore = embeddings.cosineSimilarity(queryVector, m.vector);
      }
      
      // Ajuste para dar peso na semântica sobre a prioridade pura
      const finalScore = (semanticScore * 5) + priorityScore;
      
      return {
        memory: m,
        score: finalScore
      };
    });

    // Ordena da mais relevante para a menos
    scoredMemories.sort((a, b) => b.score - a.score);
    
    // Pega as top 5 memórias para não estourar o limite de tokens da API
    const topMemories = scoredMemories.slice(0, 5);

    return topMemories.map(sm => sm.memory.content);
  }

  /**
   * Salva um acontecimento ou traço importante na base com seu respectivo embedding.
   */
  public async storeMemory(userId: string, content: string, importance: number = 5): Promise<void> {
    const vector = await embeddings.generateEmbedding(content);
    
    storage.addMemory(userId, {
      id: Math.random().toString(36).substring(2, 9),
      userId,
      content,
      timestamp: Date.now(),
      importance,
      vector
    });
  }
}

export const memoryManager = new MemoryManager();

/* === API Route para Inspeção (Dev) === */
export const memoryRouter = express.Router();

memoryRouter.get("/status", (req, res) => {
  res.json({ status: "Memory systems active." });
});

// Rota de depuração para inspecionar memória de um usuário
memoryRouter.get("/:userId", (req, res) => {
  const data = storage.loadMemories(req.params.userId);
  res.json({ total: data.length, data });
});

