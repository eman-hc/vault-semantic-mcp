/**
 * Standalone reindex script. Rebuilds the search index from the vault.
 *
 * Usage:
 *   OPENAI_API_KEY=... VAULT_ROOT=./data/vault SQLITE_PATH=./data/index/vault.db npx tsx scripts/reindex.ts
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadConfig } from "../src/config.js";
import { migrate } from "../src/db/migrate.js";
import { createOpenAIProvider } from "../src/embeddings/openai.js";
import { reindexAll } from "../src/indexing/reindex.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const dbDir = path.dirname(config.SQLITE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(config.SQLITE_PATH);
  migrate(db);

  if (!fs.existsSync(config.VAULT_ROOT)) {
    console.error(`Vault root not found: ${config.VAULT_ROOT}`);
    process.exit(1);
  }

  const verbose = process.env.VERBOSE === "1";
  console.error(`[reindex] Vault: ${config.VAULT_ROOT}`);
  console.error(`[reindex] SQLite: ${config.SQLITE_PATH}`);
  console.error("[reindex] Running full reindex...\n");

  const embeddings = createOpenAIProvider(config.OPENAI_API_KEY, config.EMBEDDING_MODEL);
  const report = await reindexAll(db, embeddings, config.VAULT_ROOT, verbose ? (r) => {
    const detail = r.action === "indexed" ? ` ${r.chunks ?? 0} chunks` : r.action === "skipped" ? " (hash unchanged)" : ` ${r.reason ?? ""}`;
    console.error(`[reindex]   ${r.path}: ${r.action}${detail}`);
  } : undefined);

  const totalChunks = report.results.reduce((sum, r) => sum + (r.chunks ?? 0), 0);
  console.error("\n[reindex] Summary:");
  console.error(`  indexed: ${report.indexed}`);
  console.error(`  skipped: ${report.skipped} (hash unchanged)`);
  console.error(`  errors:  ${report.errors}`);
  console.error(`  chunks:  ${totalChunks}`);

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
