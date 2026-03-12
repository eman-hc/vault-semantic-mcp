---
title: Vault Semantic MCP Sidecar
status: active
created: 2025-03-12
---

# Vault Semantic Sidecar for OpenClaw

This project implements a local semantic search service that runs as an MCP server sidecar alongside the OpenClaw agent. The goal is to give the agent fast access to a markdown vault without requiring remote API calls for every lookup.

## Architecture

- **Vault root**: Markdown files organized by folder (inbox, projects, decisions, entities, memory, sessions, templates)
- **SQLite index**: Derived search index only; the markdown files are the source of truth
- **MCP stdio**: Sidecar communicates with OpenClaw over standard input/output
- **Hybrid search**: FTS5 keyword + OpenAI embedding similarity

## Design Constraints

We deliberately chose not to add Docker, HTTP REST, or sqlite-vec in v1. Keep it simple and local.
