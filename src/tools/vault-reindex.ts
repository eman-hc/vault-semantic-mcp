import type Database from "better-sqlite3";
import { reindexAll, reindexPath } from "../indexing/reindex.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";

export async function vaultReindex(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  vaultRoot: string,
  args: { path?: string }
): Promise<{
  action: "full" | "single";
  indexed?: number;
  skipped?: number;
  errors?: number;
  path?: string;
  result?: string;
}> {
  if (args.path) {
    const result = await reindexPath(db, embeddings, vaultRoot, args.path);
    return {
      action: "single",
      path: args.path,
      result: result.action,
    };
  }
  const report = await reindexAll(db, embeddings, vaultRoot);
  return {
    action: "full",
    indexed: report.indexed,
    skipped: report.skipped,
    errors: report.errors,
  };
}
