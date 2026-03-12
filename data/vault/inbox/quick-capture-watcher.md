---
title: quick capture
---

# Inbox: File watcher + reindex flow

Rough note: when a vault file is added, changed, or deleted, chokidar emits events. We put them in a debounced queue. On flush, we either index the file (add/change) or remove from DB (unlink). Hash comparison avoids re-embedding unchanged content. SQLite handles the rest.
