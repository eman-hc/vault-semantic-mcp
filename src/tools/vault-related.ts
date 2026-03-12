import { z } from "zod";
import type Database from "better-sqlite3";
import { getAllChunksWithEmbeddings } from "../db/queries.js";
import { findRelated } from "../search/related.js";

const Schema = z.object({
  path: z.string().min(1),
  topK: z.number().int().positive().optional(),
});

export function vaultRelated(
  db: Database.Database,
  config: { topKDefault: number },
  args: unknown
): { results: Array<{ path: string; title: string | null; headingPath: string | null; text: string; score: number; folder: string }> } {
  const parsed = Schema.parse(args);
  const topK = parsed.topK ?? config.topKDefault;
  const allChunks = getAllChunksWithEmbeddings(db);
  const results = findRelated(db, allChunks, parsed.path, topK);
  return { results };
}
