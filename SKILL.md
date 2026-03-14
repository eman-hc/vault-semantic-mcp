---
name: vault-semantic-mcp
description: Semantic search and retrieval over the OpenClaw vault via an MCP server + watcher.
metadata: {"openclaw":{"emoji":"🧠","os":["linux","darwin","win32"],"requires":{"bins":["node","npm","mcporter"]}}}
---

# Vault Semantic MCP Skill

Semantic search and retrieval over a vault directory, exposed as MCP tools. Includes a file watcher that keeps the SQLite index in sync.

## What it does
- Indexes Markdown files under a vault root using **SQLite + FTS5** and OpenAI embeddings.
- Exposes MCP tools for search, retrieval, related notes, reindexing, and status.
- Watches for file changes to keep the index fresh.

## Requirements
- Node.js 20+
- npm
- OpenAI API key
- `mcporter` CLI installed (skill or standalone)

## Installation (new machine)
```bash
git clone <repo-url> vault-semantic-mcp
cd vault-semantic-mcp
npm install
npm run build
```

## Configuration
Create a `.env` file in the repo root:
```bash
VAULT_ROOT=/path/to/vault
SQLITE_PATH=/path/to/vault-semantic-mcp/data/index/workspace-vault.db
EMBEDDING_MODEL=text-embedding-3-small
TOP_K_DEFAULT=8
OPENAI_API_KEY=sk-...
```

> The scripts also look for `OPENAI_API_KEY` in `~/.openclaw/agents/main/agent/auth-profiles.json` if it is not in `.env`.

## Index once
```bash
npm run reindex
```

## Run the MCP server
Foreground:
```bash
node dist/index.js
```

Daemon:
```bash
./scripts/start-daemon.sh
```

## Add to mcporter
```bash
mcporter config add vault-semantic \
  --command /usr/bin/env \
  --arg bash \
  --arg /path/to/vault-semantic-mcp/scripts/run-daemon.sh \
  --description "Local semantic vault MCP" \
  --env VAULT_ROOT=/path/to/vault \
  --env SQLITE_PATH=/path/to/vault-semantic-mcp/data/index/workspace-vault.db \
  --env EMBEDDING_MODEL=text-embedding-3-small \
  --env TOP_K_DEFAULT=8 \
  --persist /path/to/mcporter.json
```

Verify:
```bash
mcporter list
mcporter call vault-semantic.vault_status
mcporter call vault-semantic.vault_search query="semantic vault"
```

## MCP tools
- `vault_search(query, folders?, topK?)`
- `vault_get(path)`
- `vault_recent(folder?, topK?)`
- `vault_related(path, topK?)`
- `vault_reindex(path?)`
- `vault_status()`

## Troubleshooting
- **Missing OPENAI_API_KEY**: set it in `.env` or auth profiles.
- **No results**: run `npm run reindex` and ensure `VAULT_ROOT` is correct.
- **Daemon not running**: re-run `./scripts/start-daemon.sh` and check `logs/vault-semantic-mcp.log`.
