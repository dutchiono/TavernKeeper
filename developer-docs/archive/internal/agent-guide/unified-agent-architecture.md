# Unified TavernKeeper Agent Architecture

**Purpose:** Design and implement a unified TavernKeeper agent that works in both Discord and the in-game interface, using ElizaOS for consistency.

## Overview

Currently, the TavernKeeper character exists in two separate implementations:
1. **Discord Bot**: `packages/discord-bot/src/services/concierge.ts` - Uses OpenAI directly
2. **In-Game**: `apps/web/app/actions/aiActions.ts` - Uses OpenAI directly

Both should use the same ElizaOS agent instance for consistency, shared memory, and unified persona.

## Architecture Design

### Current State

**Discord Bot:**
- Location: `packages/discord-bot/src/services/concierge.ts`
- AI: OpenAI (gpt-4o-mini)
- Character: TavernKeeper (via system prompt)
- Memory: None (stateless)
- Knowledge: Hardcoded (soon to be RAG)

**In-Game:**
- Location: `apps/web/app/actions/aiActions.ts`
- AI: OpenAI (gpt-4o-mini)
- Character: Generic agent system
- Memory: None (stateless)
- Knowledge: None

**In-Game Agents (Other Characters):**
- Location: `packages/agents/src/agent-wrapper.ts`
- AI: ElizaOS via `AgentWrapper`
- Memory: Short-term, episodic, long-term
- Status: Fully implemented with ElizaOS

### Target State

**Unified TavernKeeper Agent:**
- Single agent instance shared between Discord and game
- Uses ElizaOS (consistent with other game agents)
- Shared memory across platforms
- RAG integration for knowledge
- World history awareness

## Implementation

### Step 1: Create TavernKeeper Agent Config

**File**: `packages/agents/src/tavernkeeper-config.ts`

```typescript
import type { ElizaAgentConfig } from './types/eliza';

export function getTavernKeeperConfig(): ElizaAgentConfig {
  return {
    id: 'tavernkeeper',
    name: 'TavernKeeper',
    persona: {
      name: 'TavernKeeper',
      archetype: 'custom',
      aggression: 0.2,
      caution: 0.8,
      goals: [
        'Help adventurers understand the world',
        'Share knowledge about dungeons and heroes',
        'Guide players on their journey',
        'Record and remember important world events',
      ],
      traits: ['Wise', 'Friendly', 'Knowledgeable', 'Encouraging', 'Historically Aware'],
    },
    memory: {
      shortTerm: [],
      episodic: [],
      longTerm: {
        reputations: {},
        lore: [],
        relationships: {},
      },
    },
    plugins: ['memory-plugin'], // RAG plugin to be added later
  };
}
```

### Step 2: Create Unified TavernKeeper Agent Service

**File**: `packages/agents/src/tavernkeeper-agent.ts`

```typescript
import { AgentWrapper } from './agent-wrapper';
import { getTavernKeeperConfig } from './tavernkeeper-config';
import { getAgentConfig } from './config';
import type { AgentMemory } from '@innkeeper/lib';

// Import RAG service type (will be created in discord-bot package)
// For now, use interface
interface RAGService {
  search(query: string, limit: number): Promise<string[]>;
}

export class TavernKeeperAgent {
  private agent: AgentWrapper;
  private ragService?: RAGService;
  private initialized: boolean = false;
  private elizaUrl: string;
  private apiKey: string;

  constructor(elizaUrl?: string, apiKey?: string, ragService?: RAGService) {
    const config = getAgentConfig();
    this.elizaUrl = elizaUrl || config.elizaUrl || '';
    this.apiKey = apiKey || config.elizaApiKey || '';
    this.ragService = ragService;

    const agentConfig = getTavernKeeperConfig();
    this.agent = new AgentWrapper(agentConfig, this.elizaUrl, this.apiKey);
  }

  /**
   * Initialize agent with ElizaOS
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (!this.elizaUrl || !this.apiKey) {
      throw new Error('ElizaOS URL and API key required for TavernKeeper agent');
    }

    // Register memory plugin if available
    // Note: Plugin registration depends on ElizaOS API implementation
    // This is a placeholder - actual implementation depends on ElizaOS service

    await this.agent.initialize();
    this.initialized = true;
    console.log('[TavernKeeper] Agent initialized with ElizaOS');
  }

  /**
   * Answer a question as TavernKeeper
   */
  async answer(
    question: string,
    context: 'discord' | 'game',
    userId?: string
  ): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Get relevant docs via RAG if available
    let contextDocs = '';
    if (this.ragService) {
      try {
        const docs = await this.ragService.search(question, 5);
        if (docs.length > 0) {
          contextDocs = `\n\nRelevant game knowledge:\n${docs.join('\n\n---\n\n')}`;
        }
      } catch (error) {
        console.error('[TavernKeeper] RAG search error:', error);
      }
    }

    // Build system prompt with context
    const systemPrompt = `You are the TavernKeeper, a wise and friendly innkeeper and dungeon master in InnKeeper, a dungeon crawler game on the Monad blockchain. You guide adventurers, answer questions about the game, and help them understand the world. You speak in character as a knowledgeable tavern keeper who has seen many adventurers come and go. Be conversational, helpful, and in-character.

${contextDocs}

Respond as the TavernKeeper character - friendly, knowledgeable, and encouraging. If you don't know something, say so in character. Keep responses concise but informative.`;

    // Use ElizaOS agent to generate response
    // Note: Actual ElizaOS API call depends on service implementation
    // This is a placeholder - check ElizaOS documentation for actual API

    // For now, we need to check how AgentWrapper actually calls ElizaOS
    // The current implementation in agent-wrapper.ts shows placeholders
    // You'll need to implement the actual HTTP calls to ElizaOS service

    // Placeholder implementation:
    try {
      // This would be the actual ElizaOS API call
      // POST to ${elizaUrl}/api/agents/tavernkeeper/converse
      const response = await fetch(`${this.elizaUrl}/api/agents/tavernkeeper/converse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          message: question,
          systemPrompt: systemPrompt,
          context: context,
          userId: userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`ElizaOS API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || data.message || 'I apologize, but I could not generate a response.';
    } catch (error) {
      console.error('[TavernKeeper] Error calling ElizaOS:', error);
      // Fallback response
      return 'The spirits are quiet today, traveler. Perhaps try again later?';
    }
  }

  /**
   * Update agent memory with new information
   */
  async updateMemory(memory: Partial<AgentMemory>): Promise<void> {
    await this.agent.updateMemory(memory);
  }

  /**
   * Get current agent memory
   */
  getMemory(): AgentMemory {
    // This would fetch from ElizaOS or return cached
    // Implementation depends on AgentWrapper
    return this.agent.config.memory;
  }

  /**
   * Record a world event in agent memory
   */
  async recordEvent(event: {
    type: string;
    description: string;
    participants?: string[];
    location?: string;
  }): Promise<void> {
    const currentMemory = this.getMemory();

    // Add to episodic memory
    const episodicEntry = {
      runId: `event-${Date.now()}`,
      summary: `${event.type}: ${event.description}`,
      timestamp: new Date().toISOString(),
    };

    const updatedMemory: AgentMemory = {
      ...currentMemory,
      episodic: [...(currentMemory.episodic || []), episodicEntry].slice(-10), // Keep last 10
    };

    await this.updateMemory(updatedMemory);
  }
}
```

**Note**: The actual ElizaOS API endpoints may differ. Check ElizaOS documentation or the service implementation to determine the correct API structure.

### Step 3: Update Discord Bot to Use Unified Agent

**File**: `packages/discord-bot/src/services/concierge.ts`

**Changes:**

```typescript
import { TavernKeeperAgent } from '@innkeeper/agents';
import { RAGService } from './rag-service';
import { getAIConfig, getRAGConfig } from '../config';

export class ConciergeService {
  private tavernKeeper: TavernKeeperAgent | null = null;
  private ragService: RAGService | null = null;
  private gameApi: GameApiService;

  constructor() {
    const aiConfig = getAIConfig();
    const ragConfig = getRAGConfig();
    this.gameApi = new GameApiService();

    // Initialize RAG service if OpenAI key available
    if (aiConfig.openaiApiKey) {
      this.ragService = new RAGService(ragConfig.docsPath, aiConfig.openaiApiKey);
      // Initialize asynchronously
      this.ragService.initialize().catch(err => {
        console.error('[RAG] Failed to initialize:', err);
      });
    }

    // Initialize TavernKeeper agent if ElizaOS configured
    if (aiConfig.elizaUrl && aiConfig.elizaApiKey) {
      this.tavernKeeper = new TavernKeeperAgent(
        aiConfig.elizaUrl,
        aiConfig.elizaApiKey,
        this.ragService || undefined
      );
      // Initialize asynchronously
      this.tavernKeeper.initialize().catch(err => {
        console.error('[TavernKeeper] Failed to initialize:', err);
      });
    }
  }

  async answerQuestion(context: ConciergeContext): Promise<string> {
    const { question, userId } = context;

    // Check if question is about specific game data
    if (this.isDataQuery(question)) {
      return await this.handleDataQuery(question);
    }

    // Use unified TavernKeeper agent if available
    if (this.tavernKeeper) {
      try {
        return await this.tavernKeeper.answer(question, 'discord', userId);
      } catch (error) {
        console.error('[Concierge] TavernKeeper agent error:', error);
        // Fallback to OpenAI if available
      }
    }

    // Fallback to OpenAI (if no ElizaOS or if agent fails)
    // ... existing OpenAI implementation
  }
}
```

### Step 4: Update In-Game TavernKeeper

**File**: `apps/web/app/actions/aiActions.ts`

**Changes:**

```typescript
'use server';

import { Agent } from '../../lib/types';
import { TavernKeeperAgent } from '@innkeeper/agents';

// Singleton instance (shared across requests in serverless environment)
let tavernKeeper: TavernKeeperAgent | null = null;

async function getTavernKeeper(): Promise<TavernKeeperAgent | null> {
  const elizaUrl = process.env.ELIZA_URL;
  const elizaApiKey = process.env.ELIZA_API_KEY;

  if (!elizaUrl || !elizaApiKey) {
    console.warn('[TavernKeeper] ElizaOS not configured, using fallback');
    return null;
  }

  if (!tavernKeeper) {
    tavernKeeper = new TavernKeeperAgent(elizaUrl, elizaApiKey);
    await tavernKeeper.initialize();
  }

  return tavernKeeper;
}

export const chatWithAgent = async (agent: Agent, userMessage: string): Promise<string> => {
  // For TavernKeeper, use unified agent
  if (agent.name === 'TavernKeeper' || agent.id === 'tavernkeeper') {
    const tk = await getTavernKeeper();
    if (tk) {
      return await tk.answer(userMessage, 'game');
    }
    // Fallback if ElizaOS not available
  }

  // For other agents, use existing logic or create separate ElizaOS agents
  // ... existing implementation for other agents
};
```

### Step 5: Export from Agents Package

**File**: `packages/agents/src/index.ts`

**Add:**

```typescript
export { TavernKeeperAgent } from './tavernkeeper-agent';
export { getTavernKeeperConfig } from './tavernkeeper-config';
```

## Shared Memory Strategy

### Memory Types

**Short-Term Memory:**
- Last 10-20 interactions
- Context for current conversation
- Cleared periodically

**Episodic Memory:**
- Important events (dungeon clears, boss defeats)
- Per-run summaries
- Persistent across sessions

**Long-Term Memory:**
- Player reputations
- World lore
- Relationships between entities

### Memory Sharing

Both Discord and in-game contexts share the same agent instance, so memory is automatically shared. When a player asks about something in Discord, that context is available in-game and vice versa.

### Memory Updates

- **Discord**: User asks question → Agent responds → Memory updated with interaction
- **In-Game**: User chats → Agent responds → Memory updated with interaction
- **World Events**: DM records event → Agent memory updated via `recordEvent()`

## Integration Points

### Discord Bot Integration
- **File**: `packages/discord-bot/src/services/concierge.ts`
- **Change**: Replace OpenAI calls with `TavernKeeperAgent.answer()`
- **Context**: Pass `'discord'` as context parameter

### In-Game Integration
- **File**: `apps/web/app/actions/aiActions.ts`
- **Change**: Replace OpenAI calls with `TavernKeeperAgent.answer()`
- **Context**: Pass `'game'` as context parameter

### World History Integration
- **File**: `packages/engine/src/dm-manager.ts`
- **Change**: After recording world event, also update TavernKeeper memory
- **Method**: Call `tavernKeeper.recordEvent()` after `recordWorldEvent()`

## ElizaOS API Requirements

**Note**: The actual ElizaOS API structure needs to be verified. Check:
1. ElizaOS service documentation
2. `packages/agents/src/agent-wrapper.ts` for current implementation status
3. ElizaOS service endpoints

**Expected Endpoints:**
- `POST /api/agents` - Create/initialize agent
- `POST /api/agents/{id}/converse` - Get agent response
- `PATCH /api/agents/{id}` - Update agent config
- `PATCH /api/agents/{id}/memory` - Update agent memory

**If ElizaOS API differs**, adjust `TavernKeeperAgent.answer()` method accordingly.

## Testing

### Test 1: Agent Initialization
```typescript
const agent = new TavernKeeperAgent(elizaUrl, apiKey);
await agent.initialize();
console.log('Agent initialized');
```

### Test 2: Discord Context
```typescript
const response = await agent.answer('Tell me about parties', 'discord', 'user123');
console.log('Discord response:', response);
```

### Test 3: Game Context
```typescript
const response = await agent.answer('What heroes do I have?', 'game', 'user123');
console.log('Game response:', response);
```

### Test 4: Memory Sharing
```typescript
// Ask in Discord
await agent.answer('I cleared the goblin dungeon', 'discord', 'user123');

// Ask in game - should remember
const response = await agent.answer('What did I do recently?', 'game', 'user123');
// Should mention goblin dungeon
```

### Test 5: World History
```typescript
await agent.recordEvent({
  type: 'dungeon_cleared',
  description: 'Player cleared Goblin Warren',
  participants: ['0x123...'],
  location: 'Goblin Warren',
});

const response = await agent.answer('Who cleared the Goblin Warren?', 'discord');
// Should mention the event
```

## Dependencies

### Add to `packages/agents/package.json`
No new dependencies needed - uses existing `AgentWrapper`.

### Add to `packages/discord-bot/package.json`
```json
{
  "dependencies": {
    "@innkeeper/agents": "workspace:*"
  }
}
```

### Add to `apps/web/package.json`
```json
{
  "dependencies": {
    "@innkeeper/agents": "workspace:*"
  }
}
```

## Files to Create/Modify

### New Files
- `packages/agents/src/tavernkeeper-config.ts` - Agent configuration
- `packages/agents/src/tavernkeeper-agent.ts` - Unified agent service

### Modified Files
- `packages/agents/src/index.ts` - Export new classes
- `packages/discord-bot/src/services/concierge.ts` - Use `TavernKeeperAgent`
- `apps/web/app/actions/aiActions.ts` - Use `TavernKeeperAgent`
- `packages/engine/src/dm-manager.ts` - Update TavernKeeper memory after events

## Migration Steps

1. **Create agent config** - Define TavernKeeper persona
2. **Create agent service** - Implement `TavernKeeperAgent` class
3. **Test ElizaOS integration** - Verify API calls work
4. **Update Discord bot** - Replace OpenAI with `TavernKeeperAgent`
5. **Update in-game** - Replace OpenAI with `TavernKeeperAgent`
6. **Test memory sharing** - Verify context persists
7. **Add world history** - Integrate event recording

## Success Criteria

- ✅ Discord bot uses ElizaOS for TavernKeeper
- ✅ In-game TavernKeeper uses ElizaOS
- ✅ Both use same agent instance (shared memory)
- ✅ Responses are consistent across platforms
- ✅ Memory persists between interactions
- ✅ World events are recorded and queryable

## Known Limitations

1. **ElizaOS API**: Actual API structure needs verification
2. **Serverless**: Singleton pattern may not work in serverless (Vercel)
3. **Memory Persistence**: May need database storage for memory in production
4. **Rate Limiting**: ElizaOS service may have rate limits

## Next Steps

1. Verify ElizaOS API structure
2. Implement `TavernKeeperAgent` with actual API calls
3. Test with ElizaOS service
4. Integrate with Discord bot
5. Integrate with in-game
6. Add memory persistence (database)
7. Add world history recording
