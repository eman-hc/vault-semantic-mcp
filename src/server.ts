import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type Database from "better-sqlite3";
import type { Config } from "./config.js";
import type { EmbeddingProvider } from "./embeddings/provider.js";
import { vaultSearch } from "./tools/vault-search.js";
import { vaultGet } from "./tools/vault-get.js";
import { vaultRecent } from "./tools/vault-recent.js";
import { vaultRelated } from "./tools/vault-related.js";
import { vaultReindex } from "./tools/vault-reindex.js";
import { vaultStatus } from "./tools/vault-status.js";

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

export function createMcpServer(
  db: Database.Database,
  embeddings: EmbeddingProvider,
  config: Config,
  getWatcherRunning: () => boolean
): McpServer {
  const server = new McpServer(
    { name: "vault-semantic-mcp", version: "1.0.0" },
    { capabilities: { tools: { listChanged: true } } }
  );

  const topKDefault = config.TOP_K_DEFAULT;

  server.tool(
    "vault_search",
    "Hybrid semantic and keyword search over the vault",
    {
      query: z.string().describe("Search query"),
      folders: z.array(z.string()).optional().describe("Filter by folder names"),
      topK: z.number().int().positive().optional().describe("Number of results"),
    },
    async (args) => {
      const result = await vaultSearch(db, embeddings, { topKDefault }, args);
      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "vault_get",
    "Get full markdown content of a file by vault path",
    {
      path: z.string().min(1).describe("Vault-relative path, e.g. projects/foo.md"),
    },
    (args) => {
      const result = vaultGet(config.VAULT_ROOT, args);
      if ("error" in result) {
        return textResult(JSON.stringify({ error: result.error }));
      }
      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "vault_recent",
    "List recently indexed documents",
    {
      folder: z.string().optional().describe("Filter by folder"),
      topK: z.number().int().positive().optional().describe("Number of results"),
    },
    (args) => {
      const result = vaultRecent(db, args);
      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "vault_related",
    "Find notes related to a given path",
    {
      path: z.string().min(1).describe("Vault path of the source note"),
      topK: z.number().int().positive().optional().describe("Number of results"),
    },
    (args) => {
      const result = vaultRelated(db, { topKDefault }, args);
      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "vault_reindex",
    "Reindex one path or the entire vault",
    {
      path: z.string().optional().describe("Vault path to reindex, or omit for full reindex"),
    },
    async (args) => {
      const result = await vaultReindex(db, embeddings, config.VAULT_ROOT, args ?? {});
      return textResult(JSON.stringify(result, null, 2));
    }
  );

  server.tool(
    "vault_status",
    "Get vault status: root, sqlite path, document count, chunk count, watcher state",
    {},
    () => {
      const result = vaultStatus(
        db,
        { vaultRoot: config.VAULT_ROOT, sqlitePath: config.SQLITE_PATH },
        getWatcherRunning()
      );
      return textResult(JSON.stringify(result, null, 2));
    }
  );

  return server;
}

export async function runMcpServer(server: McpServer): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
