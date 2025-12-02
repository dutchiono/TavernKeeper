# Discord Bot Documentation Integration & Unified Agent Handoff

**For:** Next agent working on docs reorganization and agent unification
**Date:** December 2024
**Status:** Ready for Implementation

## Overview

This document provides a comprehensive handoff for integrating the Discord bot with game documentation (RAG system), unifying it with the in-game TavernKeeper agent using ElizaOS, implementing world history, and setting up production deployment.

## Current State

### Discord Bot
- **Location**: `packages/discord-bot/`
- **Current AI**: OpenAI via `ConciergeService` (`packages/discord-bot/src/services/concierge.ts`)
- **Knowledge Base**: Hardcoded string in `buildKnowledgeBase()` method (lines 31-115)
- **Character**: Responds as TavernKeeper character
- **Status**: Fully functional, conversational, but limited by static knowledge

### In-Game Agent System
- **Location**: `packages/agents/`
- **Framework**: ElizaOS via `AgentWrapper` (`packages/agents/src/agent-wrapper.ts`)
- **DM Agent**: `packages/engine/src/dm-manager.ts` uses ElizaOS
- **Player Agents**: Use ElizaOS during runs
- **Status**: ElizaOS integration exists but TavernKeeper not using it

### In-Game TavernKeeper
- **Location**: `apps/web/app/actions/aiActions.ts`
- **Current**: Simple OpenAI calls (not using ElizaOS)
- **Function**: `chatWithAgent()` - responds to player chat
- **Issue**: Separate from Discord bot, no shared memory/persona

### Game Documentation
- **Scattered Locations**:
  - `arc/` - Architecture docs
  - `agent-guide/` - Agent setup guides
  - `packages/contracts/docs/` - Contract documentation
  - `contributions/` - Feature documentation
  - Various README files
- **Issue**: No centralized location, hard to query programmatically

## Goals

1. **Create unified docs structure** in `docs/game/` folder
2. **Implement RAG system** to load docs dynamically
3. **Unify agents** - Use ElizaOS for both Discord and in-game TavernKeeper
4. **World history system** - DM records events, agents can query
5. **Production deployment** - GitHub Actions + Vercel setup

## Implementation Phases

### Phase 1: Documentation Reorganization

#### Task 1.1: Create Docs Structure
Create `docs/game/` folder with subdirectories:

```
docs/game/
├── README.md              # Index and navigation
├── core/                  # Core game mechanics
│   ├── gameplay.md        # How to play, parties, runs
│   ├── heroes.md          # Hero NFTs, attributes
│   ├── dungeons.md        # Dungeon mechanics
│   └── combat.md          # Combat system
├── contracts/             # Smart contract documentation
│   ├── overview.md        # Contract architecture
│   ├── tavern-regulars.md # Tavern Regulars Manager
│   ├── town-posse.md      # Town Posse Manager
│   ├── cellar.md          # The Cellar contract
│   └── erc-6551.md        # Token Bound Accounts
├── world/                 # World lore and history
│   ├── lore.md            # World background
│   ├── history.md         # World history (to be populated by DM)
│   └── locations.md       # Dungeon locations
└── agents/                # Agent behavior documentation
    ├── tavernkeeper.md    # TavernKeeper character
    ├── dungeon-master.md  # DM agent behavior
    └── player-agents.md   # Player agent behavior
```

#### Task 1.2: Consolidate Existing Docs
- **From `arc/`**: Move game mechanics docs to `docs/game/core/`
- **From `packages/contracts/docs/`**: Move contract docs to `docs/game/contracts/`
- **From `agent-guide/`**: Extract game-specific content to `docs/game/agents/`
- **From `contributions/`**: Extract relevant game mechanics to appropriate folders
- **Create cross-references**: Update original files to point to new locations

#### Task 1.3: Create Documentation Index
- **File**: `docs/game/README.md`
- **Content**:
  - Overview of documentation structure
  - Quick links to major topics
  - How to add/update documentation
  - RAG system usage notes

**Files to Create:**
- `docs/game/README.md`
- `docs/game/core/*.md` (4-5 files)
- `docs/game/contracts/*.md` (5-6 files)
- `docs/game/world/*.md` (3 files)
- `docs/game/agents/*.md` (3 files)

### Phase 2: RAG Integration

#### Task 2.1: Create RAG Service
**File**: `packages/discord-bot/src/services/rag-service.ts`

**Implementation Approach (Option A - Simple File-Based)**:
```typescript
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import OpenAI from 'openai';

interface DocumentChunk {
  path: string;
  content: string;
  embedding?: number[];
}

export class RAGService {
  private openai: OpenAI;
  private docsPath: string;
  private chunks: DocumentChunk[] = [];
  private embeddings: Map<string, number[]> = new Map();

  constructor(docsPath: string, openaiApiKey: string) {
    this.docsPath = docsPath;
    this.openai = new OpenAI({ apiKey: openaiApiKey });
  }

  async loadDocuments(): Promise<void> {
    // Recursively load all .md files from docs/game/
    // Chunk by heading/section
    // Store in this.chunks
  }

  async createEmbeddings(): Promise<void> {
    // For each chunk, create embedding via OpenAI
    // Store in this.embeddings
  }

  async search(query: string, limit: number = 5): Promise<string[]> {
    // Create embedding for query
    // Find similar chunks using cosine similarity
    // Return top N chunks as context
  }
}
```

**Key Methods:**
- `loadDocuments()` - Recursively read all `.md` files from `docs/game/`
- `chunkDocument(content: string, path: string)` - Split by headings, create chunks
- `createEmbeddings()` - Generate embeddings for all chunks
- `search(query: string, limit: number)` - Semantic search, return relevant chunks

**Dependencies to Add:**
```json
{
  "remark": "^15.0.0",
  "remark-parse": "^11.0.0"
}
```

#### Task 2.2: Update ConciergeService
**File**: `packages/discord-bot/src/services/concierge.ts`

**Changes:**
1. Remove hardcoded `buildKnowledgeBase()` method
2. Add `RAGService` dependency
3. Update `answerQuestion()` to:
   - Call `ragService.search(question)` to get relevant docs
   - Inject docs as context before AI call
   - Maintain fallback to keyword matching if RAG fails

**Code Changes:**
```typescript
export class ConciergeService {
  private ragService: RAGService;

  constructor() {
    // Initialize RAG service
    const docsPath = path.join(process.cwd(), 'docs/game');
    this.ragService = new RAGService(docsPath, process.env.OPENAI_API_KEY!);
    await this.ragService.loadDocuments();
    await this.ragService.createEmbeddings();
  }

  async answerQuestion(context: ConciergeContext): Promise<string> {
    const { question } = context;

    // Get relevant docs via RAG
    const relevantDocs = await this.ragService.search(question, 5);
    const contextDocs = relevantDocs.join('\n\n');

    // Use AI with RAG context
    if (this.openai) {
      return await this.answerWithAI(question, contextDocs);
    }
    // ... fallback
  }
}
```

#### Task 2.3: Update Config
**File**: `packages/discord-bot/src/config.ts`

**Add:**
```typescript
export interface RAGConfig {
  docsPath: string;
  embeddingModel: string;
}

export function getRAGConfig(): RAGConfig {
  return {
    docsPath: process.env.DOCS_PATH || path.join(process.cwd(), 'docs/game'),
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  };
}
```

**Files to Modify:**
- `packages/discord-bot/src/services/concierge.ts` - Replace `buildKnowledgeBase()` with RAG
- Create `packages/discord-bot/src/services/rag-service.ts` - New RAG implementation
- `packages/discord-bot/src/config.ts` - Add RAG config
- `packages/discord-bot/package.json` - Add remark dependencies

### Phase 3: ElizaOS Integration

#### Task 3.1: Create Shared TavernKeeper Agent Config
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
      ],
      traits: ['Wise', 'Friendly', 'Knowledgeable', 'Encouraging'],
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
    plugins: ['memory-plugin'], // Add RAG plugin later
  };
}
```

#### Task 3.2: Create Unified TavernKeeper Agent Service
**File**: `packages/agents/src/tavernkeeper-agent.ts`

```typescript
import { AgentWrapper } from './agent-wrapper';
import { getTavernKeeperConfig } from './tavernkeeper-config';
import { getAgentConfig } from './config';
import type { RAGService } from '@innkeeper/discord-bot/services/rag-service';

export class TavernKeeperAgent {
  private agent: AgentWrapper;
  private ragService?: RAGService;
  private initialized: boolean = false;

  constructor(elizaUrl?: string, apiKey?: string) {
    const config = getAgentConfig();
    const eliza = elizaUrl || config.elizaUrl;
    const key = apiKey || config.elizaApiKey;

    const agentConfig = getTavernKeeperConfig();
    this.agent = new AgentWrapper(agentConfig, eliza, key);
  }

  async initialize(ragService?: RAGService): Promise<void> {
    if (this.initialized) return;

    this.ragService = ragService;
    await this.agent.initialize();
    this.initialized = true;
  }

  async answer(
    question: string,
    context: 'discord' | 'game',
    userId?: string
  ): Promise<string> {
    // Get relevant docs via RAG if available
    let contextDocs = '';
    if (this.ragService) {
      const docs = await this.ragService.search(question, 5);
      contextDocs = docs.join('\n\n');
    }

    // Build system prompt with context
    const systemPrompt = `You are the TavernKeeper, a wise and friendly innkeeper and dungeon master in InnKeeper, a dungeon crawler game on the Monad blockchain. You guide adventurers, answer questions about the game, and help them understand the world. You speak in character as a knowledgeable tavern keeper who has seen many adventurers come and go. Be conversational, helpful, and in-character.

${contextDocs ? `\nRelevant game knowledge:\n${contextDocs}\n` : ''}

Respond as the TavernKeeper character - friendly, knowledgeable, and encouraging. If you don't know something, say so in character.`;

    // Use ElizaOS agent to generate response
    // This would call ElizaOS API with the prompt
    // For now, placeholder - actual implementation depends on ElizaOS API
    return await this.agent.converse(question, systemPrompt);
  }

  async updateMemory(memory: Partial<AgentMemory>): Promise<void> {
    await this.agent.updateMemory(memory);
  }
}
```

**Note**: Actual ElizaOS API integration depends on ElizaOS service API. Check `packages/agents/src/agent-wrapper.ts` for current implementation status.

#### Task 3.3: Update Discord Bot to Use Unified Agent
**File**: `packages/discord-bot/src/services/concierge.ts`

**Changes:**
1. Import `TavernKeeperAgent` from `@innkeeper/agents`
2. Replace OpenAI calls with `TavernKeeperAgent.answer()`
3. Initialize agent with RAG service

```typescript
import { TavernKeeperAgent } from '@innkeeper/agents';
import { RAGService } from './rag-service';

export class ConciergeService {
  private tavernKeeper: TavernKeeperAgent;
  private ragService: RAGService;

  constructor() {
    const aiConfig = getAIConfig();
    this.ragService = new RAGService(/* ... */);
    this.tavernKeeper = new TavernKeeperAgent(aiConfig.elizaUrl, aiConfig.elizaApiKey);
  }

  async initialize(): Promise<void> {
    await this.ragService.loadDocuments();
    await this.ragService.createEmbeddings();
    await this.tavernKeeper.initialize(this.ragService);
  }

  async answerQuestion(context: ConciergeContext): Promise<string> {
    const { question, userId } = context;
    return await this.tavernKeeper.answer(question, 'discord', userId);
  }
}
```

#### Task 3.4: Update In-Game TavernKeeper
**File**: `apps/web/app/actions/aiActions.ts`

**Changes:**
1. Replace OpenAI calls with `TavernKeeperAgent`
2. Use same agent instance as Discord bot
3. Share memory between contexts

```typescript
import { TavernKeeperAgent } from '@innkeeper/agents';

// Singleton instance (shared with Discord bot)
let tavernKeeper: TavernKeeperAgent | null = null;

async function getTavernKeeper(): Promise<TavernKeeperAgent> {
  if (!tavernKeeper) {
    tavernKeeper = new TavernKeeperAgent(
      process.env.ELIZA_URL,
      process.env.ELIZA_API_KEY
    );
    await tavernKeeper.initialize();
  }
  return tavernKeeper;
}

export const chatWithAgent = async (agent: Agent, userMessage: string): Promise<string> => {
  // For TavernKeeper, use unified agent
  if (agent.name === 'TavernKeeper' || agent.id === 'tavernkeeper') {
    const tk = await getTavernKeeper();
    return await tk.answer(userMessage, 'game');
  }

  // For other agents, use existing logic or ElizaOS
  // ...
};
```

**Files to Modify:**
- `packages/discord-bot/src/services/concierge.ts` - Replace OpenAI with `TavernKeeperAgent`
- `packages/discord-bot/src/config.ts` - Ensure ElizaOS config is loaded
- `apps/web/app/actions/aiActions.ts` - Replace with `TavernKeeperAgent`
- Create `packages/agents/src/tavernkeeper-config.ts` - Shared agent config
- Create `packages/agents/src/tavernkeeper-agent.ts` - Unified agent service
- `packages/agents/src/index.ts` - Export new classes

### Phase 4: World History System

#### Task 4.1: Database Schema
**File**: `supabase/migrations/YYYYMMDDHHMMSS_world_history.sql`

```sql
CREATE TABLE world_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  participant_wallet VARCHAR(42), -- Who did it (optional)
  location VARCHAR(100), -- Where it happened
  description TEXT NOT NULL, -- What happened
  metadata JSONB, -- Additional context (run_id, party_id, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_world_history_type ON world_history(event_type);
CREATE INDEX idx_world_history_participant ON world_history(participant_wallet);
CREATE INDEX idx_world_history_created ON world_history(created_at DESC);

-- Example event types:
-- 'dungeon_cleared', 'boss_defeated', 'treasure_found',
-- 'party_formed', 'hero_minted', 'contract_interaction'
```

#### Task 4.2: History API Endpoints
**File**: `apps/web/app/api/history/record/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { eventType, participantWallet, location, description, metadata } = await request.json();

  const supabase = createClient(/* ... */);

  const { data, error } = await supabase
    .from('world_history')
    .insert({
      event_type: eventType,
      participant_wallet: participantWallet,
      location: location,
      description: description,
      metadata: metadata || {},
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: data.id });
}
```

**File**: `apps/web/app/api/history/query/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { query, eventType, participantWallet, limit = 10 } = await request.json();

  const supabase = createClient(/* ... */);
  let queryBuilder = supabase.from('world_history').select('*');

  if (eventType) {
    queryBuilder = queryBuilder.eq('event_type', eventType);
  }

  if (participantWallet) {
    queryBuilder = queryBuilder.eq('participant_wallet', participantWallet);
  }

  if (query) {
    // Full-text search on description
    queryBuilder = queryBuilder.ilike('description', `%${query}%`);
  }

  queryBuilder = queryBuilder.order('created_at', { ascending: false }).limit(limit);

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ events: data });
}
```

#### Task 4.3: Update DM Manager to Record Events
**File**: `packages/engine/src/dm-manager.ts`

**Add method:**
```typescript
async recordWorldEvent(
  eventType: string,
  description: string,
  participantWallet?: string,
  location?: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const response = await fetch('http://localhost:3000/api/history/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType,
        participantWallet,
        location,
        description,
        metadata,
      }),
    });

    if (!response.ok) {
      console.error('Failed to record world event:', await response.text());
    }
  } catch (error) {
    console.error('Error recording world event:', error);
  }
}
```

**Call after run completion:**
```typescript
// In simulateRun or after run ends
await dmManager.recordWorldEvent(
  'dungeon_cleared',
  `Party ${partyId} cleared ${dungeonName}`,
  partyLeaderWallet,
  dungeonName,
  { runId, partyId, result }
);
```

#### Task 4.4: Integrate History into RAG
**File**: `packages/discord-bot/src/services/rag-service.ts`

**Add method:**
```typescript
async searchHistory(query: string, limit: number = 5): Promise<string[]> {
  try {
    const response = await fetch(`${this.apiBaseUrl}/history/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit }),
    });

    const { events } = await response.json();
    return events.map((e: any) =>
      `[${e.created_at}] ${e.description} (${e.location || 'Unknown'})`
    );
  } catch (error) {
    console.error('Error querying history:', error);
    return [];
  }
}
```

**Update search to include history:**
```typescript
async search(query: string, limit: number = 5): Promise<string[]> {
  const docChunks = await this.searchDocuments(query, limit);
  const historyEvents = await this.searchHistory(query, 3);

  return [
    ...docChunks,
    ...(historyEvents.length > 0 ? [`\n## Recent World Events\n${historyEvents.join('\n')}`] : []),
  ];
}
```

**Files to Create:**
- `supabase/migrations/YYYYMMDDHHMMSS_world_history.sql` - Database schema
- `apps/web/app/api/history/record/route.ts` - Record events
- `apps/web/app/api/history/query/route.ts` - Query history
- Update `packages/engine/src/dm-manager.ts` - Record events
- Update `packages/discord-bot/src/services/rag-service.ts` - Include history in search

### Phase 5: Production Deployment

#### Task 5.1: GitHub Actions CI/CD
**File**: `.github/workflows/discord-bot.yml`

```yaml
name: Discord Bot CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'packages/discord-bot/**'
  pull_request:
    branches: [main]
    paths:
      - 'packages/discord-bot/**'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Build Discord bot
        run: pnpm --filter @innkeeper/discord-bot build

      - name: Run tests
        run: pnpm --filter @innkeeper/discord-bot test
        continue-on-error: true

      - name: Lint
        run: pnpm --filter @innkeeper/discord-bot lint
        continue-on-error: true
```

#### Task 5.2: Vercel Configuration
**File**: `vercel.json` (if deploying bot to Vercel)

```json
{
  "buildCommand": "pnpm --filter @innkeeper/discord-bot build",
  "outputDirectory": "packages/discord-bot/dist",
  "installCommand": "pnpm install",
  "framework": null,
  "env": {
    "DISCORD_BOT_TOKEN": "@discord-bot-token",
    "DISCORD_CLIENT_ID": "@discord-client-id",
    "DISCORD_GUILD_ID": "@discord-guild-id",
    "ELIZA_URL": "@eliza-url",
    "ELIZA_API_KEY": "@eliza-api-key",
    "OPENAI_API_KEY": "@openai-api-key",
    "DATABASE_URL": "@database-url"
  }
}
```

**Note**: Discord bot requires persistent WebSocket connection, so Vercel serverless functions may not be ideal. Consider separate service (Railway, Render, etc.).

#### Task 5.3: Deployment Architecture

**Recommended Setup:**
- **Web App**: Vercel (Next.js)
- **Discord Bot**: Separate Node.js service (Railway, Render, Fly.io, or VPS)
- **Database**: Supabase (shared)
- **Redis**: Upstash (shared)
- **ElizaOS**: Separate service (where to host?)

**Discord Bot Deployment Options:**

**Option A: Railway**
- Create `railway.json` or use Railway dashboard
- Set environment variables
- Deploy from GitHub
- Pros: Easy, good for Node.js services
- Cons: Costs money after free tier

**Option B: Render**
- Create `render.yaml`
- Set environment variables
- Deploy from GitHub
- Pros: Free tier available
- Cons: Slower cold starts

**Option C: Fly.io**
- Create `fly.toml`
- Deploy via `flyctl`
- Pros: Good performance, global distribution
- Cons: More complex setup

**Option D: VPS (DigitalOcean, Linode, etc.)**
- Manual deployment
- Use PM2 or systemd for process management
- Pros: Full control
- Cons: Manual maintenance

**Recommendation**: Start with Railway or Render for simplicity.

**Files to Create:**
- `.github/workflows/discord-bot.yml` - CI/CD pipeline
- `railway.json` or `render.yaml` - Deployment config (if using those services)
- `packages/discord-bot/Dockerfile` - Container image (optional)
- `packages/discord-bot/.dockerignore` - Docker ignore file
- Update `package.json` scripts for production

## Key Files to Modify

### For RAG Integration
- `packages/discord-bot/src/services/concierge.ts` - Replace `buildKnowledgeBase()` with RAG
- Create `packages/discord-bot/src/services/rag-service.ts` - New RAG implementation
- `packages/discord-bot/src/config.ts` - Add RAG config
- `packages/discord-bot/package.json` - Add remark dependencies

### For ElizaOS Integration
- `packages/discord-bot/src/services/concierge.ts` - Replace OpenAI with `TavernKeeperAgent`
- `packages/discord-bot/src/config.ts` - Ensure ElizaOS config is loaded
- `apps/web/app/actions/aiActions.ts` - Replace with `TavernKeeperAgent`
- Create `packages/agents/src/tavernkeeper-config.ts` - Shared agent config
- Create `packages/agents/src/tavernkeeper-agent.ts` - Unified agent service
- `packages/agents/src/index.ts` - Export new classes

### For World History
- Create `supabase/migrations/YYYYMMDDHHMMSS_world_history.sql` - Database schema
- Create `apps/web/app/api/history/record/route.ts` - Record events
- Create `apps/web/app/api/history/query/route.ts` - Query history
- Update `packages/engine/src/dm-manager.ts` - Record events after runs
- Update `packages/discord-bot/src/services/rag-service.ts` - Include history in search

### For Production
- Create `.github/workflows/discord-bot.yml` - CI/CD
- Create deployment config files (Railway, Render, etc.)
- Update `package.json` scripts for production builds
- Create `packages/discord-bot/Dockerfile` (optional)

## Dependencies to Add

### For RAG
```json
{
  "remark": "^15.0.0",
  "remark-parse": "^11.0.0",
  "unified": "^11.0.0"
}
```

### For Vector Search (Optional - if using vector DB)
```json
{
  "@pinecone-database/pinecone": "^1.1.0"
}
```
OR
```json
{
  "@langchain/community": "^0.0.20",
  "@langchain/openai": "^0.0.10"
}
```

## Testing Requirements

### RAG Testing
- Test document loading from `docs/game/`
- Test chunking by headings
- Test embedding generation
- Test semantic search with various queries
- Test fallback to keyword matching

### Unified Agent Testing
- Test Discord bot responses using ElizaOS
- Test in-game TavernKeeper responses using ElizaOS
- Verify shared memory between contexts
- Test character consistency across platforms

### World History Testing
- Test event recording after dungeon runs
- Test history query API
- Test history integration in RAG search
- Test agent queries about past events

### Production Deployment Testing
- Test GitHub Actions workflow
- Test deployment to staging environment
- Test environment variable loading
- Test bot reconnection after deployment

## Environment Variables Needed

### Discord Bot
- `DISCORD_BOT_TOKEN` - Bot token
- `DISCORD_CLIENT_ID` - Application client ID
- `DISCORD_GUILD_ID` - Server ID
- `ELIZA_URL` - ElizaOS service URL
- `ELIZA_API_KEY` - ElizaOS API key
- `OPENAI_API_KEY` - For embeddings (RAG)
- `DATABASE_URL` - Supabase connection string
- `REDIS_URL` - Redis connection (if needed)
- `DOCS_PATH` - Path to docs folder (default: `docs/game`)

### Web App (for history API)
- `DATABASE_URL` - Supabase connection string
- `ELIZA_URL` - ElizaOS service URL
- `ELIZA_API_KEY` - ElizaOS API key

## Implementation Order

1. **Phase 1**: Reorganize docs into `docs/game/` structure
2. **Phase 2**: Implement RAG service and integrate with Discord bot
3. **Phase 3**: Create unified TavernKeeper agent and integrate ElizaOS
4. **Phase 4**: Implement world history system
5. **Phase 5**: Set up production deployment

## Success Criteria

- ✅ All game docs organized in `docs/game/`
- ✅ Discord bot uses RAG to answer questions from docs
- ✅ Both Discord and in-game use same ElizaOS agent
- ✅ DM records events to world history
- ✅ Agents can query world history
- ✅ Production deployment working (GitHub + service)
- ✅ Bot responds consistently across platforms

## Questions to Resolve

1. **ElizaOS API**: What is the actual API for `AgentWrapper.converse()`? Check `packages/agents/src/agent-wrapper.ts` implementation.
2. **ERC-6551**: Verify if game actually uses ERC-6551 for TBAs. Update docs accordingly.
3. **Deployment Service**: Which service to use for Discord bot? (Railway, Render, Fly.io, VPS?)
4. **ElizaOS Hosting**: Where will ElizaOS service be hosted in production?
5. **Vector DB**: Start with simple file-based RAG or use vector database from start?

## References

- Discord Bot Progress: `agent-guide/discord-bot-progress.md`
- ElizaOS Setup: `agent-guide/eliza-setup.md`
- Agent System: `arc/agent-system.md`
- Dungeon Master Update: `agent-guide/dun
