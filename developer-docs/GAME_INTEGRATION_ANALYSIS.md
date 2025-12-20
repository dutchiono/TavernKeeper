# Game Integration Analysis: Map Generator & Agent Playability

## Executive Summary

This analysis examines the current state of the game engine, Mike's map generator contribution, and the agent system to identify gaps preventing agents from actually playing the game. The analysis reveals significant scaffolding is needed to connect these systems.

## 1. Current System Architecture

### 1.1 Game Engine (`packages/engine/`)
- **State Management**: `EngineState` tracks entities, turns, events, RNG, and dungeon state
- **Map Loading**: `map-loader.ts` loads static JSON maps (`DungeonMap` format)
- **Current Maps**: Only 2 hardcoded maps (`abandoned-cellar`, `goblin-warren`)
- **Simulation**: `simulateRun()` orchestrates turn-based gameplay
- **Action Execution**: `executeAction()` processes actions and generates events
- **Spatial System**: Room transitions, movement validation, position tracking

### 1.2 Mike's Map Generator (`apps/web/contributions/map-generator-system/`)
- **Purpose**: Generates infinite 2D surface world + 3D dungeons with z-levels
- **Structure**:
  - `MapCell` → Surface world cells with features
  - `Dungeon` → Multi-level structures (z-levels, ~100 layers)
  - `DungeonLevel` → Contains `Room[]` arrays
  - `Room` → Has encounters, loot, connections
- **Storage**: `MapStorage` class for persistence (not yet connected to database)
- **Generation**: Procedural generation with seeds for determinism

### 1.3 Agent System (`packages/agents/`)
- **AgentWrapper**: Interfaces with ElizaOS (mostly placeholder implementations)
- **DMManager**: Controls all monster entities
- **Plugins**:
  - `GameActionPlugin` - Submits actions (calls API endpoint)
  - `MemoryPlugin` - Manages agent memory (not updating)
  - `DMPlugin` - DM-specific functionality
- **Action Context**: Agents receive `{ turnNumber, events, worldState }`

## 2. Critical Gaps Identified

### 2.1 Map Format Mismatch

**Problem**: Mike's generator produces `Dungeon` type, but engine expects `DungeonMap` type.

**Mike's Format** (`map-generation.ts`):
```typescript
Dungeon {
  levels: DungeonLevel[]  // Array of z-levels
  // Each level has rooms
}

DungeonLevel {
  z: number
  rooms: Room[]  // Different Room structure
  connections: LevelConnection[]
}
```

**Engine Format** (`dungeon.ts`):
```typescript
DungeonMap {
  rooms: Room[]  // Flat array, no z-levels
  width: number
  height: number
  objectives: DungeonObjective[]
}
```

**Impact**:
- Cannot use generated maps in engine
- No adapter/converter exists
- Engine only supports single-level dungeons

### 2.2 Map Generator Not Integrated

**Missing Components**:
- No connection between `MapGenerator` and `map-loader.ts`
- `MapStorage` not connected to database (Supabase)
- No API endpoints to generate/load maps from generator
- Engine's `loadMap()` only reads static JSON files

**Current Flow**:
```
Static JSON → map-loader.ts → Engine
```

**Needed Flow**:
```
MapGenerator → Database → map-loader.ts → Engine
OR
MapGenerator → Converter → DungeonMap → Engine
```

### 2.3 Agent Action System Incomplete

**Issues**:
1. **AgentWrapper.getAction()**: Returns `null` by default, only uses hooks (not implemented)
2. **No Real ElizaOS Integration**: All methods are placeholders with console.logs
3. **Action Context Limited**: Agents only get:
   - Last 10 events
   - Entity map
   - Current room ID
   - Missing: Map structure, room descriptions, objectives, available actions

**Agent Context Needs**:
```typescript
{
  turnNumber: number
  events: GameEvent[]  // ✅ Present
  worldState: {
    entities: Map<string, Entity>  // ✅ Present
    currentRoom?: string  // ✅ Present
    // ❌ MISSING:
    map?: DungeonMap  // Full map structure
    currentRoomDetails?: Room  // Room description, connections
    objectives?: DungeonObjective[]  // What needs to be done
    availableActions?: ActionType[]  // What can be done
    nearbyEntities?: Entity[]  // Entities in same room
  }
}
```

### 2.4 Memory System Not Updating

**Problem**: `MemoryPlugin` exists but never updates agent memories with game events.

**Current Code** (`engine.ts:498-501`):
```typescript
// Update agent memories with new events
for (const wrapper of agentWrappers.values()) {
  // In production, update via MemoryPlugin
  // For now, events are already in state.events
}
```

**Impact**: Agents have no memory of what happened, can't learn or adapt.

### 2.5 DM Agent Context Missing

**Problem**: DM agent doesn't receive:
- Map structure (can't understand room layout)
- Monster stats/details (only entity IDs)
- Objectives (doesn't know what to challenge party with)
- Room descriptions (can't narrate)

**Current DM Context** (`dm-manager.ts:71-80`):
```typescript
{
  turnNumber: number
  events: GameEvent[]
  worldState: {
    entities: Map<string, Entity>
    currentRoom?: string
    controllingEntityId: string  // ✅ Added
  }
}
```

### 2.6 No API Endpoints for Agent Actions

**Problem**: `GameActionPluginImpl` calls `/api/agents/${agentId}/action` but this endpoint doesn't exist.

**Missing**:
- `apps/web/app/api/agents/[id]/action/route.ts`
- Endpoint to receive agent actions
- Validation and execution pipeline
- Response with resulting events

### 2.7 Map Storage Not Connected

**Problem**: `MapStorage` class exists but:
- No database schema/migrations
- No Supabase integration
- Methods are placeholders

**Missing**:
- Database tables for `MapCell`, `Dungeon`, `DungeonLevel`, `Room`
- Supabase client integration
- CRUD operations

## 3. Agent Playability Assessment

### 3.1 What Agents CAN Do (Currently)

✅ **Receive Context**:
- Turn number
- Recent events (last 10)
- Entity positions and stats
- Current room ID

✅ **Submit Actions**:
- Move (if valid coordinates)
- Attack (if target exists)
- Skill checks
- Use items
- Interact

✅ **Basic Decision Making**:
- Can see entities in world state
- Can see recent combat/exploration events

### 3.2 What Agents CANNOT Do (Critical Gaps)

❌ **Understand Map Structure**:
- Don't know room connections
- Don't know where they can move
- Don't know room descriptions
- Don't know objectives

❌ **Make Informed Decisions**:
- Can't see nearby entities (only all entities)
- Can't understand spatial relationships
- Can't plan movement paths
- Can't understand room transitions

❌ **Learn from Experience**:
- Memory not updating
- No episodic memory
- No relationship tracking

❌ **DM-Specific Functions**:
- Can't narrate rooms
- Can't generate descriptions
- Can't understand monster capabilities
- Can't create engaging encounters

## 4. Required Scaffolding

### 4.1 Map Integration Layer

**Priority: CRITICAL**

1. **Create Map Adapter/Converter**
   - Convert `Dungeon` (multi-level) → `DungeonMap` (single-level)
   - OR: Extend engine to support multi-level dungeons
   - Handle z-level navigation

2. **Integrate MapGenerator with Engine**
   - Add `generateMap()` method to `map-loader.ts`
   - Connect `MapStorage` to Supabase
   - Create API endpoints for map generation

3. **Database Schema**
   - Tables for map cells, dungeons, levels, rooms
   - Migration scripts

### 4.2 Enhanced Agent Context

**Priority: CRITICAL**

1. **Expand World State**
   ```typescript
   worldState: {
     entities: Map<string, Entity>
     map: DungeonMap  // Full map
     currentRoom: Room  // Room details
     objectives: DungeonObjective[]
     nearbyEntities: Entity[]  // Same room
     availableActions: ActionType[]
   }
   ```

2. **Room Context Helper**
   - Function to get entities in same room
   - Function to get connected rooms
   - Function to get room description

3. **Objective Tracking**
   - Current objective status
   - Progress indicators
   - Completion requirements

### 4.3 Agent Action Pipeline

**Priority: HIGH**

1. **Create API Endpoint**
   - `POST /api/agents/[id]/action`
   - Validate action
   - Execute via engine
   - Return events

2. **Implement ElizaOS Integration**
   - Real HTTP calls to ElizaOS
   - Agent creation/update
   - Action decision endpoint
   - Memory updates

3. **Action Validation Layer**
   - Pre-validate actions before execution
   - Check spatial constraints
   - Check resource availability

### 4.4 Memory System

**Priority: HIGH**

1. **Event Processing**
   - Process events into memory format
   - Update episodic memory
   - Update relationships
   - Track reputations

2. **Memory Plugin Implementation**
   - Connect to MemoryPlugin
   - Update agent memories after each turn
   - Query memories for context

### 4.5 DM Enhancements

**Priority: MEDIUM**

1. **DM Context Expansion**
   - Map structure
   - Monster details
   - Objectives
   - Room descriptions

2. **Narrative Generation**
   - Room descriptions
   - Event descriptions
   - Encounter narration

3. **Tactical AI**
   - Monster behavior patterns
   - Encounter balancing
   - Challenge scaling

## 5. Implementation Priority

### Phase 1: Core Playability (CRITICAL)
1. ✅ Map format adapter/converter
2. ✅ Enhanced agent context (map, room, objectives)
3. ✅ API endpoint for agent actions
4. ✅ Room context helpers

### Phase 2: Agent Intelligence (HIGH)
5. ✅ Memory system updates
6. ✅ ElizaOS integration
7. ✅ Action validation improvements

### Phase 3: Map Integration (HIGH)
8. ✅ Database schema for maps
9. ✅ MapStorage Supabase integration
10. ✅ Map generation API endpoints

### Phase 4: DM Enhancement (MEDIUM)
11. ✅ DM context expansion
12. ✅ Narrative generation
13. ✅ Tactical AI

## 6. Documentation Gaps

**Missing Documentation**:
- How agents should interpret world state
- Action decision-making guidelines
- Map structure explanation for agents
- Objective completion logic
- Room transition rules
- Combat mechanics for agents

## 7. Testing Requirements

**Needed Tests**:
- Map conversion (Dungeon → DungeonMap)
- Agent context generation
- Action validation
- Memory updates
- Room transitions
- Objective tracking

## 8. Recommendations

1. **Start with Map Adapter**: Without this, generated maps are unusable
2. **Expand Agent Context**: Agents need map structure to make decisions
3. **Implement Action API**: Agents need a way to submit actions
4. **Fix Memory System**: Agents need to learn from events
5. **Add Integration Tests**: Test full agent → engine → events → memory cycle

## 9. Next Steps

1. Create map adapter/converter
2. Expand agent context in `simulateRun()`
3. Create `/api/agents/[id]/action` endpoint
4. Implement memory updates
5. Add room context helpers
6. Test with simple scenario
