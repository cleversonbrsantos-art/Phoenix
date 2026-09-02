/**
 * Utilitários para limpeza de strings e outputs da IA.
 */
export const filters = {
  /**
   * Remove blocos de raciocínio como <think>...</think> se o modelo (NVIDIA/Gemini) gerar o pensamento na saída bruta.
   */
  removeThoughts(text: string): string {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  },
  
  /**
   * Cleans unnecessary formatting for Phoenix's voice output.
   */
  cleanForTTS(text: string): string {
    // Remove emojis ou asteriscos usados em markdown (opcional)
    let cleaned = text.replace(/[*#]/g, "");
    // Remove links
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/g, "");
    return cleaned.trim();
  }
};
