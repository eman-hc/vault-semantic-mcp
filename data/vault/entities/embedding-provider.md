---
title: Embedding Provider Interface
type: entity
---

# Embedding Provider Abstraction

The `EmbeddingProvider` interface defines:

```ts
embed(texts: string[]): Promise<number[][]>
```

## Implementations

- **OpenAI**: Uses text-embedding-3-small via the OpenAI Node SDK
- Batches chunks (up to 100 per request) for efficiency
- Future: Ollama provider could swap in for fully local operation

## Cost Considerations

OpenAI charges per token. We batch to reduce round-trips. For reindexing large vaults, expect a few cents per thousand chunks. Semantic search adds one embedding call per query.
