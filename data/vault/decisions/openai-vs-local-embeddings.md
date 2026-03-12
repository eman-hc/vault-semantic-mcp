---
title: Why OpenAI embeddings instead of local
date: 2025-03-11
---

# Decision: OpenAI Embeddings for v1

We are using OpenAI text-embedding-3-small for embeddings rather than a local model like Ollama.

## Reasons

1. **Quality**: OpenAI embeddings are well-tested and produce consistent results across queries
2. **Simplicity**: No need to run a separate embedding service locally
3. **Cost**: At ~$0.02 per 1M tokens, cost is low for personal vaults
4. **Time to ship**: We can add Ollama support later if desired

## Future

We may add a swappable embedding provider to support Ollama or other local models. The `EmbeddingProvider` interface is designed for that.
