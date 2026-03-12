/**
 * Local test harness for indexing + retrieval quality.
 * Uses the same hybridSearch used by vault_search.
 *
 * Usage:
 *   OPENAI_API_KEY=... VAULT_ROOT=./data/vault SQLITE_PATH=./data/index/vault.db npx tsx scripts/test-search.ts
 *   npm run test:search
 *
 * Optionally skip reindex:
 *   SKIP_REINDEX=1 npm run test:search
 */
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadConfig } from "../src/config.js";
import { migrate } from "../src/db/migrate.js";
import { getDocumentCount, getChunkCount } from "../src/db/queries.js";
import { createOpenAIProvider } from "../src/embeddings/openai.js";
import { reindexAll } from "../src/indexing/reindex.js";
import { hybridSearch } from "../src/search/search.js";

const EVALUATION_QUERIES = [
  { id: "exact_keyword_sqlite", query: "SQLite" },
  { id: "exact_keyword_chunking", query: "chunking" },
  { id: "semantic_memory_routing", query: "how should the agent store durable knowledge" },
  { id: "embedding_cost_strategy", query: "why are we using OpenAI instead of local embeddings" },
  { id: "file_watcher_reindex", query: "what happens when vault files are edited" },
  { id: "related_notes_openclaw", query: "notes related to semantic search sidecar" },
  { id: "decision_log_architecture", query: "where did we decide to keep the vault files as source of truth" },
  { id: "fts_keyword_mcp", query: "MCP" },
] as const;

const SNIPPET_LEN = 120;

function snippet(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= SNIPPET_LEN) return t;
  return t.slice(0, SNIPPET_LEN) + "…";
}

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

  const skipReindex = process.env.SKIP_REINDEX === "1";

  if (!skipReindex) {
    console.error("[test-search] Reindexing vault...");
    const embeddings = createOpenAIProvider(config.OPENAI_API_KEY, config.EMBEDDING_MODEL);
    const report = await reindexAll(db, embeddings, config.VAULT_ROOT);
    const totalChunks = report.results.reduce((sum, r) => sum + (r.chunks ?? 0), 0);
    console.error(`[test-search] Indexed: ${report.indexed} files, ${report.skipped} skipped, ${totalChunks} chunks\n`);
  } else {
    const docCount = getDocumentCount(db);
    const chunkCount = getChunkCount(db);
    console.error(`[test-search] Skipped reindex. DB: ${docCount} docs, ${chunkCount} chunks\n`);
  }

  const embeddings = createOpenAIProvider(config.OPENAI_API_KEY, config.EMBEDDING_MODEL);
  const topK = config.TOP_K_DEFAULT;

  for (const { id, query } of EVALUATION_QUERIES) {
    console.log("═".repeat(72));
    console.log(`QUERY: ${id}`);
    console.log(`  "${query}"`);
    console.log("─".repeat(72));

    const results = await hybridSearch(db, embeddings, query, topK);

    if (results.length === 0) {
      console.log("  (no results)\n");
      continue;
    }

    results.forEach((r, i) => {
      console.log(`  ${i + 1}. score=${r.score.toFixed(4)}  ${r.path}`);
      console.log(`     title: ${r.title ?? "(none)"}`);
      if (r.headingPath) console.log(`     heading: ${r.headingPath}`);
      console.log(`     snippet: ${snippet(r.text)}`);
      console.log();
    });
  }

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
