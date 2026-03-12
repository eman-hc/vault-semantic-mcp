import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { loadConfig } from "./config.js";
import { migrate } from "./db/migrate.js";
import { createOpenAIProvider } from "./embeddings/openai.js";
import { reindexAll } from "./indexing/reindex.js";
import { IndexQueue } from "./indexing/queue.js";
import { indexFile } from "./indexing/index-file.js";
import { deleteDocumentByPath } from "./db/queries.js";
import { scanMarkdownFiles } from "./vault/scan.js";
import { createWatcher } from "./vault/watcher.js";
import { createMcpServer, runMcpServer } from "./server.js";
import { toVaultPath } from "./vault/paths.js";

async function main(): Promise<void> {
  const config = loadConfig();

  const dbDir = path.dirname(config.SQLITE_PATH);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(config.SQLITE_PATH);
  migrate(db);

  const embeddings = createOpenAIProvider(config.OPENAI_API_KEY, config.EMBEDDING_MODEL);

  let watcherRunning = false;
  const getWatcherRunning = () => watcherRunning;

  const queue = new IndexQueue(async (items) => {
    for (const item of items) {
      try {
        if (item.action === "delete") {
          const vaultPath = toVaultPath(config.VAULT_ROOT, item.path);
          deleteDocumentByPath(db, vaultPath);
          console.error(`[vault-mcp] watcher: deleted ${vaultPath}`);
        } else {
          const result = await indexFile(db, embeddings, config.VAULT_ROOT, item.path);
          const detail = result.action === "skipped" ? ` (hash unchanged)` : ` (${result.chunks ?? 0} chunks)`;
          console.error(`[vault-mcp] watcher: ${result.action} ${result.path}${detail}`);
        }
      } catch (err) {
        console.error(`[vault-mcp] Error:`, err);
      }
    }
  }, 500);

  if (fs.existsSync(config.VAULT_ROOT)) {
    const fileCount = scanMarkdownFiles(config.VAULT_ROOT).length;
    console.error(`[vault-mcp] Vault: ${config.VAULT_ROOT} (${fileCount} .md files)`);
    console.error("[vault-mcp] Running startup scan...");
    const report = await reindexAll(db, embeddings, config.VAULT_ROOT);
    const totalChunks = report.results.reduce((sum, r) => sum + (r.chunks ?? 0), 0);
    console.error(
      `[vault-mcp] Startup: indexed=${report.indexed} skipped=${report.skipped} (hash unchanged) errors=${report.errors} chunks=${totalChunks}`
    );
  } else {
    console.error(`[vault-mcp] Vault root not found: ${config.VAULT_ROOT}`);
  }

  if (fs.existsSync(config.VAULT_ROOT)) {
    console.error("[vault-mcp] Watcher started");
    const watcher = createWatcher(
      config.VAULT_ROOT,
      {
        onAdd: (filePath) => queue.enqueue(filePath, "index"),
        onChange: (filePath) => queue.enqueue(filePath, "index"),
        onUnlink: (filePath) => queue.enqueue(filePath, "delete"),
      },
      300
    );
    watcherRunning = true;
  }

  const server = createMcpServer(db, embeddings, config, getWatcherRunning);
  await runMcpServer(server);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
