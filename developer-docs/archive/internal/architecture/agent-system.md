# Agent System — ElizaOS Integration

## Overview

Agents are implemented with ElizaOS. Each Agent has:

* `persona` (archetype, goals, traits)
* `memory` (short, episodic, long-term)
* `plugins` (action plugin to call the engine)
* `hooks` (onRunStart, onTurn, onRunEnd)

## Memory Patterns

* **Short-term**: last 10 events (for in-run decision-making)
* **Episodic**: per-run summary pointer (runId)
* **Long-term**: reputations, lore, relationships

Store only IDs in agent memory, not full-world dumps. Agents can fetch world state via API when needed.

## Example Eliza agent manifest

```json
{
  "id": "agent-luna",
  "persona": {"name":"Luna","archetype":"rogue","aggression":0.6},
  "plugins": ["game-action-plugin","memory-plugin"]
}
```

## Plugins

* **game-action-plugin**: formatting intents -> POST `/api/agents/:id/action`
* **memory-plugin**: persistent memory writes/reads to DB
* **dm-plugin** (optional): restricted toolset to generate room descriptions

## Decision Loop (per encounter)

1. DM announces room (engine event)
2. Agents exchange messages (Eliza convos) to form intent
3. Each agent submits a single `intent` (action + args)
4. Engine executes intents and returns events
5. Agents are fed the events; memory updated
6. Repeat until run end

## Safety & Constraints

* Agents cannot call DB directly; actions must go through engine endpoints
* Rate limit agent API to control token consumption

## Example agent-to-engine flow

1. Agent: "I will sneak to the pedestal and inspect"
2. Plugin extracts intent `{action: 'inspect', target: 'pedestal'}` and POSTs
3. Engine resolves a `skill_check` and returns success/failure event
4. Agent updates memory: `found: +gold` or `trap: hit`.

---

Next I will create `miniapp-and-frames.md` detailing Farcaster Frame endpoints, signed responses, and dynamic image generation.
