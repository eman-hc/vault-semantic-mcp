/**
 * Interface for embedding providers. Swappable for future Ollama support.
 */
export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}
