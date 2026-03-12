import { z } from "zod";
import type Database from "better-sqlite3";
import { hybridSearch } from "../search/search.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";

const Schema = z.object({
  query: z.string(),
  folders: z.array(z.string()).optional(),
  topK: z.number().int().positive().optional(),
});

export async function vaultSearch(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  config: { topKDefault: number },
  args: unknown
): Promise<{ results: Array<{ path: string; title: string | null; headingPath: string | null; text: string; score: number; folder: string }> }> {
  const parsed = Schema.parse(args);
  const topK = parsed.topK ?? config.topKDefault;
  const results = await hybridSearch(db, embeddings, parsed.query, topK, parsed.folders);
  return { results };
}
