import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import { deleteDocumentByPath } from "../db/queries.js";
import { indexFile } from "./index-file.js";
import { scanMarkdownFiles } from "../vault/scan.js";
import type { EmbeddingProvider } from "../embeddings/provider.js";
import type { IndexResult } from "./index-file.js";

export interface ReindexReport {
  indexed: number;
  skipped: number;
  errors: number;
  deleted: number;
  results: IndexResult[];
}

export async function reindexAll(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  vaultRoot: string,
  onResult?: (result: IndexResult) => void
): Promise<ReindexReport> {
  const files = scanMarkdownFiles(vaultRoot);
  const report: ReindexReport = { indexed: 0, skipped: 0, errors: 0, deleted: 0, results: [] };

  for (const fullPath of files) {
    const result = await indexFile(db, embeddings, vaultRoot, fullPath);
    report.results.push(result);
    if (result.action === "indexed") report.indexed++;
    else if (result.action === "skipped") report.skipped++;
    else report.errors++;
    onResult?.(result);
  }

  return report;
}

export async function reindexPath(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  vaultRoot: string,
  vaultPath: string
): Promise<IndexResult> {
  const fullPath = path.join(vaultRoot, vaultPath);
  if (!fs.existsSync(fullPath)) {
    deleteDocumentByPath(db, vaultPath);
    return { path: vaultPath, action: "indexed", reason: "deleted" };
  }
  return indexFile(db, embeddings, vaultRoot, fullPath);
}
