---
title: Agent memory routing rules
tags: [ memory, agent, openclaw ]
---

# Agent Memory Routing Rules

How durable knowledge should be stored and retrieved for the OpenClaw agent:

## Routing by folder

- **memory/**: Long-term reference, facts, rules
- **entities/**: People, projects, concepts
- **decisions/**: Architecture and design decisions
- **projects/**: Active work, goals, next steps
- **sessions/**: Session summaries, ephemeral context
- **inbox/**: Rough captures, to be triaged

## Search ranking

Folder boosts apply so memory, entities, and decisions rank higher than inbox. This surfaces durable knowledge over raw captures when the agent searches.
