import { z } from "zod";
import type Database from "better-sqlite3";
import { getRecentDocuments } from "../db/queries.js";

const Schema = z.object({
  folder: z.string().optional(),
  topK: z.number().int().positive().optional(),
});

export function vaultRecent(
  db: Database.Database,
  args: unknown
): { documents: Array<{ path: string; folder: string; title: string | null; indexed_at: string }> } {
  const parsed = Schema.parse(args);
  const limit = parsed.topK ?? 20;
  const docs = getRecentDocuments(db, parsed.folder, limit);
  return {
    documents: docs.map((d) => ({
      path: d.path,
      folder: d.folder,
      title: d.title,
      indexed_at: d.indexed_at,
    })),
  };
}
