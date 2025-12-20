# Agent Playability Analysis Summary

## Quick Status

**Current State**: Agents CANNOT effectively play the game due to missing scaffolding.

**Main Issues**:
1. Map generator format doesn't match engine format
2. Agents lack sufficient context (no map structure, objectives, room details)
3. Agent action system incomplete (no API endpoint, placeholder implementations)
4. Memory system not updating
5. Map generator not integrated with engine

## Analysis Documents

1. **[GAME_INTEGRATION_ANALYSIS.md](./GAME_INTEGRATION_ANALYSIS.md)** - Full detailed analysis
2. **[MAP_FORMAT_COMPARISON.md](./MAP_FORMAT_COMPARISON.md)** - Format differences and conversion strategy

## Critical Gaps (Must Fix)

### 1. Map Format Mismatch ⚠️ CRITICAL
- **Problem**: Mike's generator produces `Dungeon` (multi-level), engine expects `DungeonMap` (single-level)
- **Impact**: Generated maps cannot be used in engine
- **Solution**: Create converter or extend engine for multi-level support
- **Files**: `packages/engine/src/map-loader.ts`, `apps/web/contributions/map-generator-system/`

### 2. Agent Context Too Limited ⚠️ CRITICAL
- **Problem**: Agents only receive last 10 events, entity map, current room ID
- **Missing**: Map structure, room details, objectives, nearby entities, available actions
- **Impact**: Agents can't make informed decisions
- **Solution**: Expand `worldState` in `simulateRun()` and `getMonsterAction()`
- **Files**: `packages/engine/src/engine.ts`, `packages/engine/src/dm-manager.ts`

### 3. No Agent Action API ⚠️ CRITICAL
- **Problem**: `GameActionPlugin` calls `/api/agents/[id]/action` but endpoint doesn't exist
- **Impact**: Agents cannot submit actions
- **Solution**: Create API endpoint to receive and execute agent actions
- **Files**: `apps/web/app/api/agents/[id]/action/route.ts` (needs creation)

### 4. Memory System Not Updating ⚠️ HIGH
- **Problem**: Memory plugin exists but never updates agent memories
- **Impact**: Agents can't learn or remember past events
- **Solution**: Implement memory updates after each turn
- **Files**: `packages/engine/src/engine.ts`, `packages/agents/src/plugins/memory-plugin.ts`

### 5. Map Generator Not Integrated ⚠️ HIGH
- **Problem**: MapGenerator exists but not connected to engine or database
- **Impact**: Cannot use generated maps
- **Solution**: Integrate MapGenerator with map-loader and Supabase
- **Files**: `packages/engine/src/map-loader.ts`, `apps/web/contributions/map-generator-system/code/storage/map-storage.ts`

## What Agents CAN Do (Currently)

✅ Receive basic context (turn number, recent events, entities)
✅ Submit actions (if API existed)
✅ See entity positions and stats
✅ See current room ID

## What Agents CANNOT Do (Critical Gaps)

❌ Understand map structure (room connections, layout)
❌ See room descriptions or details
❌ Know objectives (what they need to accomplish)
❌ See nearby entities (only all entities)
❌ Learn from experience (memory not updating)
❌ Make informed movement decisions (no spatial awareness)
❌ DM agents can't narrate or understand monster capabilities

## Implementation Priority

### Phase 1: Core Playability (Do First)
1. **Map Converter** - Convert `Dungeon` → `DungeonMap` format
2. **Enhanced Agent Context** - Add map, room, objectives to worldState
3. **Agent Action API** - Create `/api/agents/[id]/action` endpoint
4. **Room Context Helpers** - Functions to get entities in room, connected rooms

### Phase 2: Agent Intelligence
5. **Memory Updates** - Update agent memories after each turn
6. **ElizaOS Integration** - Real HTTP calls (currently placeholders)
7. **Action Validation** - Better pre-validation before execution

### Phase 3: Map Integration
8. **Database Schema** - Tables for map cells, dungeons, levels
9. **MapStorage Integration** - Connect to Supabase
10. **Map Generation API** - Endpoints to generate/load maps

### Phase 4: DM Enhancement
11. **DM Context Expansion** - Map structure, monster details, objectives
12. **Narrative Generation** - Room/event descriptions
13. **Tactical AI** - Better monster behavior

## Quick Start: Getting Agents Playing

### Step 1: Create Map Converter
```typescript
// packages/engine/src/map-converter.ts
export function convertDungeonToDungeonMap(
  dungeon: Dungeon,
  levelZ: number = -1
): DungeonMap {
  // Implementation (see MAP_FORMAT_COMPARISON.md)
}
```

### Step 2: Expand Agent Context
```typescript
// In engine.ts simulateRun()
worldState: {
  entities: state.entities,
  map: state.dungeonState?.map,  // ADD THIS
  currentRoom: getRoomDetails(entity.roomId, state.dungeonState?.map),  // ADD THIS
  objectives: state.dungeonState?.map.objectives,  // ADD THIS
  nearbyEntities: getEntitiesInRoom(entity.roomId, state.entities),  // ADD THIS
}
```

### Step 3: Create Agent Action API
```typescript
// apps/web/app/api/agents/[id]/action/route.ts
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { action } = await req.json();
  // Validate and execute action
  // Return events
}
```

### Step 4: Update Memory System
```typescript
// In engine.ts after each turn
for (const wrapper of agentWrappers.values()) {
  await wrapper.updateMemory({
    // Process events into memory format
  });
}
```

## Files That Need Changes

### High Priority
- `packages/engine/src/engine.ts` - Expand agent context, fix memory updates
- `packages/engine/src/dm-manager.ts` - Expand DM context
- `packages/engine/src/map-loader.ts` - Add generated map loading
- `apps/web/app/api/agents/[id]/action/route.ts` - **CREATE THIS FILE**

### Medium Priority
- `packages/engine/src/map-converter.ts` - **CREATE THIS FILE**
- `packages/engine/src/spatial.ts` - Add room context helpers
- `packages/agents/src/plugins/memory-plugin.ts` - Implement memory updates
- `apps/web/contributions/map-generator-system/code/storage/map-storage.ts` - Connect to Supabase

### Low Priority
- `packages/agents/src/agent-wrapper.ts` - Real ElizaOS integration
- `packages/agents/src/plugins/dm-plugin.ts` - Narrative generation
- Database migrations for map storage

## Testing Checklist

- [ ] Map conversion works (Dungeon → DungeonMap)
- [ ] Agents receive map structure in context
- [ ] Agents receive room details in context
- [ ] Agents receive objectives in context
- [ ] Agent action API accepts and executes actions
- [ ] Memory updates after each turn
- [ ] Room context helpers work correctly
- [ ] DM agent receives monster details
- [ ] Generated maps can be loaded in engine
- [ ] Full simulation runs end-to-end

## Next Steps

1. **Read Full Analysis**: Review `GAME_INTEGRATION_ANALYSIS.md` for details
2. **Understand Format Differences**: Review `MAP_FORMAT_COMPARISON.md`
3. **Start with Phase 1**: Map converter + Enhanced context + Action API
4. **Test Incrementally**: Test each piece before moving to next
5. **Iterate**: Add features based on what agents need

## Questions to Answer

Before implementing, clarify:
- Should we support multi-level dungeons now or flatten to single-level?
- How should agents discover objectives? (explicit in context vs. infer from map)
- What level of detail do agents need about rooms? (full description vs. summary)
- How should memory be structured? (what events to remember, how long)
- Should DM agent control all monsters or just some?

## Estimated Effort

- **Phase 1 (Core Playability)**: 2-3 days
- **Phase 2 (Agent Intelligence)**: 2-3 days
- **Phase 3 (Map Integration)**: 3-4 days
- **Phase 4 (DM Enhancement)**: 2-3 days

**Total**: ~2 weeks for full implementation
