# ElizaOS Setup Guide

## Overview

InnKeeper uses ElizaOS for AI agent behavior. This guide explains how to configure and integrate ElizaOS agents.

## Prerequisites

1. ElizaOS service running (local or remote)
2. API key for ElizaOS (see [API Keys Guide](./api-keys.md))
3. Understanding of agent personas and memory systems

## Configuration

### Environment Variables

Add these to your root `.env` file:

```env
ELIZA_URL=http://localhost:3001
ELIZA_API_KEY=your-eliza-api-key-here
```

### Agent Structure

Agents are defined with:
- **Persona**: Archetype, goals, traits, aggression level
- **Memory**: Short-term, episodic, long-term
- **Plugins**: game-action-plugin, memory-plugin, dm-plugin

## Agent Package

The agent integration is in `packages/agents/`.

### Key Files

- `src/agent-wrapper.ts` - Main agent wrapper class
- `src/plugins/` - Plugin implementations
- `src/types/eliza.ts` - TypeScript interfaces

### Creating an Agent

```typescript
import { AgentWrapper } from '@innkeeper/agents';
import { GameActionPluginImpl, MemoryPluginImpl } from '@innkeeper/agents';

const agent = new AgentWrapper(
  {
    id: 'agent-luna',
    name: 'Luna',
    persona: {
      name: 'Luna',
      archetype: 'rogue',
      aggression: 0.6,
      caution: 0.4,
    },
    memory: {
      shortTerm: [],
      episodic: [],
      longTerm: {},
    },
    plugins: ['game-action-plugin', 'memory-plugin'],
  },
  process.env.ELIZA_URL!,
  process.env.ELIZA_API_KEY!
);

// Register plugins
agent.registerPlugin(new GameActionPluginImpl());
agent.registerPlugin(new MemoryPluginImpl());

// Initialize with ElizaOS
await agent.initialize();
```

## Plugins

### Game Action Plugin

Allows agents to submit actions to the game engine.

**Location**: `packages/agents/src/plugins/game-action-plugin.ts`

**Usage**: Agents call `submitAction()` to send actions to `/api/agents/[id]/action`

### Memory Plugin

Handles persistent memory reads/writes.

**Location**: `packages/agents/src/plugins/memory-plugin.ts`

**Features**:
- Read/write agent memory
- Update short-term memory (last 10 events)
- Add episodic memory (per-run summaries)

### DM Plugin

Restricted toolset for generating room descriptions.

**Location**: `packages/agents/src/plugins/dm-plugin.ts`

**Usage**: DM agent uses this to generate narrative descriptions

## Agent Decision Loop

During a run:

1. **DM announces room** (engine event)
2. **Agents exchange messages** (ElizaOS conversations)
3. **Each agent submits intent** (action + args)
4. **Engine executes** and returns events
5. **Agents update memory** with events
6. **Repeat** until run end

## API Integration

### Agent Conversation Endpoint

`POST /api/agents/[id]/converse`

Updates agent persona and memory based on player conversation.

### Agent Action Endpoint

`POST /api/agents/[id]/action`

Submits agent action to game engine for execution.

## Memory Patterns

### Short-Term Memory

Last 10 events for in-run decision-making:
```typescript
{
  shortTerm: [
    { eventId: 'event-123', timestamp: 1234567890 },
    // ... last 10 events
  ]
}
```

### Episodic Memory

Per-run summaries:
```typescript
{
  episodic: [
    { runId: 'run-123', summary: 'Defeated goblin, found treasure' },
    // ... past runs
  ]
}
```

### Long-Term Memory

Reputations, lore, relationships:
```typescript
{
  longTerm: {
    reputations: { 'entity-123': 0.8 },
    lore: ['Goblins are weak to fire'],
    relationships: { 'entity-456': 'ally' },
  }
}
```

## Worker Integration

Agents are loaded in workers (`apps/web/workers/runWorker.ts`) during run simulation:

1. Load agent configurations from database
2. Initialize agent wrappers
3. During simulation, agents submit actions each turn
4. Events are fed back to agents for memory updates

## Testing

1. Start ElizaOS service
2. Set environment variables
3. Create test agent in database
4. Call `/api/agents/[id]/converse` to update persona
5. Submit test action via `/api/agents/[id]/action`

## Troubleshooting

**Agent not responding?**
- Check `ELIZA_URL` is correct
- Verify `ELIZA_API_KEY` is set
- Check ElizaOS service is running

**Actions not executing?**
- Verify agent exists in database
- Check action validation in engine
- Review API route handlers

**Memory not persisting?**
- Check database connection
- Verify Supabase schema matches
- Review memory plugin implementation

## Next Steps

1. Set up ElizaOS service (local or cloud)
2. Add API keys (see [API Keys Guide](./api-keys.md))
3. Create initial agents in database
4. Test agent conversations
5. Test agent actions in runs

## Resources

- ElizaOS Documentation: [link to docs]
- Agent Package Code: `packages/agents/`
- API Routes: `apps/web/app/api/agents/`

