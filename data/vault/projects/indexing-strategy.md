---
title: Indexing Strategy
tags: [ indexing, architecture ]
---

# Indexing Strategy for the Vault

## Approach

We index only `.md` files under the vault root. Each file is:

1. Hashed (SHA256) to skip reindex when unchanged
2. Parsed for frontmatter and content
3. Chunked by headings with paragraph subdivision for large sections
4. Embedded via OpenAI text-embedding-3-small
5. Stored in SQLite with FTS5 for full-text

## Chunking Tradeoffs

- **By heading**: Preserves structure; sections map to logical units
- **Subdivision**: Sections > ~500 tokens are split by paragraph groups
- **Token estimate**: Simple heuristic (chars * 0.25) for sizing

We don't track line numbers precisely in v1; that can be added later if needed.
