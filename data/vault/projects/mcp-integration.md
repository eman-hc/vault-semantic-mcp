---
title: MCP Integration with OpenClaw
status: in-progress
---

# MCP Integration

The vault server exposes six tools over MCP stdio:

- `vault_search`: Hybrid semantic + keyword search
- `vault_get`: Fetch full markdown for a path
- `vault_recent`: Recently indexed documents
- `vault_related`: Find notes similar to a given path
- `vault_reindex`: Trigger reindex (path or full)
- `vault_status`: Health and stats

## Usage by OpenClaw

The agent should use `vault_search` for exploratory queries and `vault_get` when it needs the full content of a specific note. `vault_related` helps surface context when working on a particular file.
