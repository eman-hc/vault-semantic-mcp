---
title: Vault files are source of truth
date: 2025-03-10
decision: accepted
---

# Decision: Markdown Files Are Source of Truth

We decided explicitly that the vault markdown files are the canonical source. The SQLite database is a derived index only.

## Rationale

- Users edit markdown directly in Obsidian, VS Code, or any editor
- Reindex rebuilds the index; no data loss if DB is corrupted
- Simplifies sync and version control: only .md files matter
- Avoids split-brain between DB and files

## Implication

Never write search results or derived data back into SQLite as if it were authoritative. The DB is for retrieval speed only.
