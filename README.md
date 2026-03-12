# vault-semantic-mcp

A local semantic search MCP server for a Markdown vault. Intended as a sidecar for OpenClaw or other MCP-enabled agents.

## What it does

- **Indexes** markdown files under a vault root (inbox, projects, decisions, entities, memory, sessions, templates)
- **Chunks** content by headings, with paragraph subdivision for large sections
- **Embeds** chunks using OpenAI `text-embedding-3-small` (stored as JSON in SQLite for v1)
- **Search** combines FTS5 keyword search with cosine-similarity semantic search and folder-based ranking
- **Related notes** finds notes similar to a given path
- **File watcher** keeps the index in sync as files change
- **MCP tools** expose everything to agents over stdio

**Important:** The vault markdown files are the source of truth. The SQLite database is a derived search index only. If the DB is lost, it can be rebuilt with a full reindex.

## Architecture

- **Vault root** → scan `.md` files → parse frontmatter, chunk by headings
- **Chunks** → OpenAI embeddings → stored in SQLite with FTS5 for full-text
- **Search** → hybrid FTS + semantic → folder boost (memory/entities/decisions > projects/sessions > inbox)
- **MCP** → stdio transport → tools call search/get/recent/related/reindex/status

## Setup

1. **Requirements:** Node.js 20+

2. **Install:**
   ```bash
   npm install
   ```

3. **Configure:** Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set `OPENAI_API_KEY` and adjust paths:
   - `VAULT_ROOT` – vault directory (default `./data/vault`)
   - `SQLITE_PATH` – index DB (default `./data/index/vault.db`)

4. **Run:**
   ```bash
   npm run dev   # development with watch
   npm run build && npm start   # production
   ```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (required) | OpenAI API key for embeddings |
| `VAULT_ROOT` | `./data/vault` | Root directory of the markdown vault |
| `SQLITE_PATH` | `./data/index/vault.db` | Path to SQLite index database |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `TOP_K_DEFAULT` | `8` | Default number of search results |

## MCP usage

Configure your MCP client (e.g. OpenClaw) to run this server via stdio:

```json
{
  "mcpServers": {
    "vault": {
      "command": "node",
      "args": ["/path/to/vault-semantic-mcp/dist/index.js"],
      "env": {
        "OPENAI_API_KEY": "...",
        "VAULT_ROOT": "/path/to/vault",
        "SQLITE_PATH": "/path/to/index/vault.db"
      }
    }
  }
}
```

Or with tsx for development:

```json
{
  "mcpServers": {
    "vault": {
      "command": "npx",
      "args": ["tsx", "/path/to/vault-semantic-mcp/src/index.ts"],
      "env": { ... }
    }
  }
}
```

### Tools

| Tool | Args | Description |
|------|------|-------------|
| `vault_search` | `query`, `folders?`, `topK?` | Hybrid search over the vault |
| `vault_get` | `path` | Get full markdown for a file |
| `vault_recent` | `folder?`, `topK?` | Recently indexed documents |
| `vault_related` | `path`, `topK?` | Notes related to a given path |
| `vault_reindex` | `path?` | Reindex one path or whole vault |
| `vault_status` | – | Vault root, counts, watcher state |

## Local validation (test harness)

Before wiring into OpenClaw, validate indexing and retrieval locally:

### Seed vault

The repo includes sample notes in `data/vault/` across projects, decisions, entities, memory, sessions, and inbox. Add or edit markdown files as needed.

### Run test harness

```bash
# Reindex and run all evaluation queries (uses OPENAI_API_KEY)
npm run test:search

# Skip reindex, reuse existing index (faster for iterating on queries)
SKIP_REINDEX=1 npm run test:search
```

The harness runs the same `hybridSearch` used by `vault_search`, so results reflect real MCP behavior.

### Evaluation queries

| Query ID | Purpose |
|----------|---------|
| `exact_keyword_sqlite` | FTS exact term match |
| `exact_keyword_chunking` | FTS on common term |
| `semantic_memory_routing` | Semantic: "how should the agent store durable knowledge" |
| `embedding_cost_strategy` | Semantic: "why OpenAI instead of local embeddings" |
| `file_watcher_reindex` | Semantic: "what happens when vault files are edited" |
| `related_notes_openclaw` | Semantic: "notes related to semantic search sidecar" |
| `decision_log_architecture` | Semantic: "where did we decide vault files as source of truth" |
| `fts_keyword_mcp` | FTS exact term |

### What to inspect

- **Exact matches** (SQLite, MCP, chunking): FTS should surface those notes
- **Semantic matches**: Different phrasing should find the right notes (e.g. "durable knowledge" → memory/durable-knowledge-storage)
- **Deduplication**: At most one chunk per document in results
- **Folder ranking**: memory/entities/decisions should rank higher than inbox for similar content
- **Snippets**: Chunk text should be readable and relevant

### Reindex only

```bash
npm run reindex
VERBOSE=1 npm run reindex   # log each file
```

## Embeddings

- v1 uses **OpenAI** `text-embedding-3-small` and stores vectors as **JSON** in SQLite.
- No sqlite-vec or vector extensions. Future versions may add Ollama support.

## License

MIT
