---
title: SQLite schema
type: entity
---

# SQLite Schema Design

## Tables

- **documents**: One row per indexed file
  - path, folder, title, sha256, mtime_ms, frontmatter_json, indexed_at
  - path is UNIQUE
- **chunks**: One row per content chunk
  - document_id, chunk_index, heading_path, text, text_hash, embedding_json
  - ON DELETE CASCADE when document removed
- **chunks_fts**: FTS5 virtual table over chunk text
  - Synced via triggers

## Why No sqlite-vec

We store embeddings as JSON in v1. sqlite-vec would enable native vector search but adds complexity. For small-to-medium vaults, loading embeddings into memory and scoring in app code is acceptable. We can migrate later if needed.
