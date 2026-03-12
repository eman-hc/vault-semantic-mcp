---
title: Session 2025-03-11 planning
---

# Planning Session: Sidecar Architecture

## Discussed

- MCP sidecar vs embedded search
- File watcher behavior: what happens when vault files are edited?
  - Answer: chokidar fires add/change/unlink; we debounce and enqueue reindex
  - Hash check skips unchanged files
- Chunking: by heading, then by paragraph for large sections

## Open questions

- How to handle very large vaults (10k+ files)?
- Do we need incremental embedding updates or is full replace fine?
