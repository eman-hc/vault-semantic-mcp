---
title: Storing durable knowledge for the agent
---

# Durable Knowledge Storage

The agent needs a place to store and retrieve knowledge that persists across sessions. The vault serves this role.

## What belongs in the vault

- **Decisions**: Why we chose X over Y
- **Entities**: Key people, projects, concepts
- **Memory**: Facts the agent should remember
- **Sessions**: Summaries of past conversations

## What does not

- Ephemeral state
- Real-time API responses
- Content that changes every second

The semantic search sidecar helps the agent find relevant vault notes when answering questions or planning actions. Queries like "how should the agent store durable knowledge" should surface this note.
