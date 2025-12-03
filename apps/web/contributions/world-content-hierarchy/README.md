# World Content Hierarchy System

## What This Does

This contribution implements a top-down hierarchical system for game world contents that tracks the provenance, history, and lore of all game elements. The system continuously answers the question "where did this come from?" by building a persistent world lore database.

When characters clear a dungeon, defeat a boss, or obtain unique gear, the system:
- Establishes the world context (where is this dungeon located? who built it?)
- Generates historical lore (what is the story of this place/item/creature?)
- Creates connections between elements (this sword was forged by the same civilization that built this dungeon)
- Builds a persistent world that agents and players can reference

## Key Concepts

### Provenance Tracking
Every game element has a provenance chain that answers:
- **Origin**: Where did this come from?
- **Creator**: Who made/built/created this?
- **History**: What events shaped this element?
- **Connections**: What other world elements are related?

### Hierarchical Structure
World content is organized in a hierarchy:
- **World** (top level)
  - **Regions** (geographical areas)
    - **Locations** (specific places: cities, ruins, landmarks)
      - **Dungeons** (adventure sites)
        - **Rooms** (dungeon sections)
          - **Encounters** (bosses, events)
            - **Loot** (items found)

### Lore Generation
The system generates contextual lore for elements:
- **Dungeon Lore**: History, purpose, builder, age, significance
- **Item Lore**: Material, creator, age, previous owners, significance
- **Boss Lore**: Origin, motivations, history, connections
- **Event Lore**: How events fit into world history

## Where It Should Be Integrated

### Type Definitions
- `packages/lib/src/types/world-content.ts` - World content types and interfaces
- `packages/lib/src/index.ts` - Export new types

### World Content System
- `packages/engine/src/world-content/` - New directory for world content system
  - `world-manager.ts` - Main world content manager
  - `lore-generator.ts` - Generates lore for world elements
  - `provenance-tracker.ts` - Tracks provenance chains
  - `content-hierarchy.ts` - Manages hierarchical relationships

### Database Schema
- `supabase/migrations/YYYYMMDDHHMMSS_world_content.sql` - Tables for world content storage

### Integration Points
- `packages/engine/src/engine.ts` - Generate world content when dungeons/items/bosses are created
- `apps/web/workers/runWorker.ts` - Create world content entries after runs
- `apps/web/lib/services/worldContentService.ts` - Service for querying world content
- `packages/agents/src/plugins/` - Plugin for agents to access world lore

### API Endpoints (Optional)
- `apps/web/app/api/world/lore/route.ts` - Query world lore
- `apps/web/app/api/world/provenance/route.ts` - Get provenance chains

## How to Test

### Unit Tests
1. Test world content hierarchy creation
2. Test lore generation for different element types
3. Test provenance chain tracking
4. Test hierarchical relationships

### Integration Tests
1. Create a dungeon and verify world content is generated
2. Obtain an item and verify its lore is created
3. Defeat a boss and verify its story is generated
4. Query world content and verify connections

### Manual Testing
1. Run a dungeon and check generated world content
2. Query lore for a dungeon/item/boss
3. Verify provenance chains are maintained
4. Check that world content persists across sessions

## Dependencies

- May integrate with AI/LLM service for lore generation (optional - can use templates)
- Uses existing database connection (Supabase)
- Integrates with existing event system and logging system

## Breaking Changes

None - this is an additive feature. Existing game elements can be retroactively assigned world content.

## Design Decisions

1. **Hierarchical Organization**: World content is organized in a strict hierarchy to maintain relationships and context.

2. **Provenance Chains**: Every element tracks its origin, creator, and history to build rich world lore.

3. **Lore Generation**: Lore can be generated via templates (deterministic) or AI (dynamic), with templates as the default.

4. **Persistent World**: World content is stored permanently and grows over time, creating a living world history.

5. **Event Integration**: World content is generated/updated when significant events occur (dungeon clears, boss defeats, unique item finds).

6. **Agent Integration**: Agents can query world lore to inform their decisions and conversations.

## Code Structure

```
contributions/world-content-hierarchy/
├── README.md (this file)
├── DESIGN.md (design overview)
├── code/
│   ├── types/
│   │   └── world-content.ts         # World content types
│   ├── world-content/
│   │   ├── world-manager.ts          # Main manager
│   │   ├── lore-generator.ts         # Lore generation
│   │   ├── provenance-tracker.ts     # Provenance tracking
│   │   └── content-hierarchy.ts       # Hierarchy management
│   ├── services/
│   │   └── worldContentService.ts     # Service for querying
│   └── database/
│       └── migration.sql               # Database schema
└── examples/
    └── usage-examples.ts              # Integration examples
```

## Integration Example

```typescript
// When a dungeon is cleared:
import { WorldManager } from '@innkeeper/engine/world-content';

const worldManager = new WorldManager();

// Generate world content for the dungeon
const dungeonContent = await worldManager.createDungeonContent({
  dungeonId: 'dungeon-123',
  dungeonSeed: seed,
  clearedBy: partyIds,
  clearedAt: new Date(),
  location: 'Northern Wastes',
  discoveredItems: itemIds,
  defeatedBosses: bossIds,
});

// Query the lore
const lore = await worldManager.getLore('dungeon-123');
console.log(lore.history); // "Built by the ancient Dwarven Kingdom..."
console.log(lore.creator); // "Dwarven Kingdom"
console.log(lore.connections); // Related locations, items, etc.
```

## Notes

- World content is generated deterministically based on seeds where possible
- Lore can be enriched over time as more events occur
- The system builds connections between elements automatically
- World content serves as a persistent knowledge base for the game world
- Agents can reference world lore to make more informed decisions







