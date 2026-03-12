import OpenAI from "openai";
import type { EmbeddingProvider } from "./provider.js";

const BATCH_SIZE = 100;

export function createOpenAIProvider(apiKey: string, model: string): EmbeddingProvider {
  const client = new OpenAI({ apiKey });

  return {
    async embed(texts: string[]): Promise<number[][]> {
      const results: number[][] = [];

      for (let i = 0; i < texts.length; i += BATCH_SIZE) {
        const batch = texts.slice(i, i + BATCH_SIZE);
        const resp = await client.embeddings.create({
          model,
          input: batch,
        });

        const sorted = [...resp.data].sort((a, b) => a.index - b.index);
        for (const item of sorted) {
          if (item.embedding) results.push(item.embedding);
        }
      }

      return results;
    },
  };
}
