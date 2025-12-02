# Game Engine Updates - Frontend Integration Guide

**Date**: Current Session
**From**: Backend/Engine Agent
**To**: Frontend Agent

## 🎯 What Changed - Engine Improvements

The game engine has been significantly enhanced with full agent integration, spatial systems, and two hand-crafted maps. Here's what you need to know:

### ✅ Major New Features

1. **Two Hand-Crafted Maps Available**
   - `abandoned-cellar` - 3-room dungeon (Entry → Storage → Boss)
   - `goblin-warren` - 5-room dungeon with multiple encounters
   - Maps include: rooms, spawn points, items, enemies, objectives

2. **Full Agent Integration**
   - Player agents now make decisions each turn via ElizaOS
   - DM agent controls all monsters/NPCs
   - Actions are queued and executed in initiative order

3. **Spatial System**
   - Entities track which room they're in (`roomId` on Entity)
   - Room transitions generate `enter_room`/`exit_room` events
   - Movement validated within room boundaries
   - Attacks require entities to be in same room

4. **Dungeon State Tracking**
   - Engine tracks discovered rooms
   - Entity positions within rooms
   - Room connections and transitions

5. **Objective System**
   - Maps define victory conditions (e.g., "defeat_boss")
   - Engine checks objectives each turn
   - Proper win/loss detection

## 📊 New Data Structures

### Entity Updates
```typescript
interface Entity {
  id: string;
  name: string;
  stats: EntityStats;
  position?: Position;
  roomId?: string;        // NEW: Current room
  inventory?: Item[];     // NEW: Items carried
  isPlayer?: boolean;     // NEW: Player vs monster
}
```

### Dungeon Map Structure
```typescript
interface DungeonMap {
  id: string;
  name: string;
  seed: string;
  width: number;
  height: number;
  rooms: Room[];
  objectives: DungeonObjective[];
}

interface Room {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'room' | 'corridor' | 'chamber' | 'boss';
  connections: string[];  // Connected room IDs
  spawnPoints: SpawnPoint[];
  items: MapItem[];
  enemies: MapEnemy[];
}

interface DungeonObjective {
  type: 'defeat_boss' | 'retrieve_item' | 'clear_room' | 'survive';
  target: string;  // Entity ID or item ID
}
```

### New Event Types
```typescript
// Room transition events
{
  type: 'exploration',
  action: 'enter_room' | 'exit_room',
  roomId: string,
  actorId: string
}

// Narrative events (from DM)
{
  type: 'narrative',
  text: string,
  speakerId?: string
}
```

## 🔌 API Changes

### Creating Runs
The `simulateRun` function is now **async** and requires additional parameters:

```typescript
// OLD (synchronous)
const result = simulateRun({
  dungeonSeed: string,
  runId: string,
  startTime: number,
  entities: Entity[],
  maxTurns?: number
});

// NEW (async, with map and agents)
const result = await simulateRun({
  dungeonSeed: string,
  runId: string,
  startTime: number,
  entities: Entity[],
  maxTurns?: number,
  mapId?: string,        // NEW: Map to load ('abandoned-cellar' or 'goblin-warren')
  agentIds?: string[],   // NEW: Agent IDs for player entities
  elizaUrl?: string,     // NEW: Optional ElizaOS URL override
  elizaApiKey?: string   // NEW: Optional ElizaOS API key override
});
```

### Run Results
Results now include dungeon state:

```typescript
interface SimulationResult {
  events: GameEvent[];
  finalState: EngineState;
  turns: Turn[];
  result: 'victory' | 'defeat' | 'timeout' | 'abandoned';
}

// EngineState now includes:
interface EngineState {
  entities: Map<string, Entity>;
  currentTurn: number;
  turnOrder: string[];
  events: GameEvent[];
  seed: string;
  rng: RNG;
  dungeonState?: DungeonState;  // NEW
}
```

## 🎮 What You Can Do Now

### 1. Display Map Information
- **Load map data**: Use `loadMap(mapId)` from `@innkeeper/engine`
- **Show room layout**: Render rooms with connections
- **Display objectives**: Show victory conditions
- **Track discovered rooms**: Use `dungeonState.discoveredRooms`

### 2. Visualize Spatial State
- **Show entity positions**: Entities have `roomId` and `position`
- **Render room transitions**: Listen for `enter_room`/`exit_room` events
- **Validate movement**: Show why movement might be invalid
- **Room-based UI**: Show different UI based on current room

### 3. Enhanced Run Visualization
- **Room transitions**: Animate entities moving between rooms
- **Room discovery**: Highlight newly discovered rooms
- **Spatial context**: Show which entities are in which rooms
- **Objective progress**: Display objective completion status

### 4. Agent Status Display
- **Agent decisions**: Show which agent made which action
- **DM narration**: Display narrative events from DM
- **Agent memory**: Track agent memory updates (via events)

### 5. Map Selection UI
- **Map picker**: Let users choose between available maps
- **Map preview**: Show map structure before starting
- **Map info**: Display map name, objectives, difficulty

## 📝 What to Report Back

### ✅ Working Well
- Which features are working as expected?
- What data structures are helpful?
- What API responses are clear?

### ❌ Issues Found
- Any TypeScript type errors?
- Missing data in API responses?
- Confusing event structures?
- Performance issues with large runs?

### 🚀 Feature Requests
- What additional data do you need?
- What helper functions would be useful?
- What events are missing?
- What map information is needed?

### 🐛 Bugs
- Incorrect entity positions?
- Room transitions not working?
- Objectives not completing?
- Agent actions not executing?

## 🔍 Testing Your Integration

### Test Map Loading
```typescript
import { loadMap, getAvailableMaps } from '@innkeeper/engine';

// Get available maps
const maps = getAvailableMaps(); // ['abandoned-cellar', 'goblin-warren']

// Load a map
const map = loadMap('abandoned-cellar');
if (map) {
  console.log('Map name:', map.name);
  console.log('Rooms:', map.rooms.length);
  console.log('Objectives:', map.objectives);
}
```

### Test Run Creation
```typescript
import { simulateRun } from '@innkeeper/engine';

const result = await simulateRun({
  dungeonSeed: 'test-seed',
  runId: 'test-run-1',
  startTime: Date.now(),
  entities: playerEntities,
  mapId: 'abandoned-cellar',
  agentIds: ['agent-1', 'agent-2'],
  maxTurns: 50
});

// Check dungeon state
if (result.finalState.dungeonState) {
  console.log('Discovered rooms:', result.finalState.dungeonState.discoveredRooms);
  console.log('Entity positions:', result.finalState.dungeonState.entities);
}
```

### Test Event Types
```typescript
// Filter events by type
const roomEvents = result.events.filter(e =>
  e.type === 'exploration' &&
  (e.action === 'enter_room' || e.action === 'exit_room')
);

const narrativeEvents = result.events.filter(e =>
  e.type === 'narrative'
);
```

## 📚 Available Maps

### Map 1: "The Abandoned Cellar" (`abandoned-cellar`)
- **3 rooms**: Entry → Storage → Boss Chamber
- **Entry room**: Starting point, no enemies
- **Storage room**: 2-3 items, 1-2 weak enemies (Giant Rats)
- **Boss chamber**: 1 boss (Skeletal Guardian), treasure
- **Objective**: Defeat boss

### Map 2: "The Goblin Warren" (`goblin-warren`)
- **5 rooms**: Entrance → 2 Side Rooms → Central → Boss
- **Entrance**: Starting point
- **Side rooms**: Goblin encounters (2-3 goblins each)
- **Central chamber**: Treasure, optional encounter
- **Boss room**: Goblin Chief + 1-2 guards
- **Objective**: Defeat goblin chief

## 🛠️ Helper Functions Available

From `@innkeeper/engine`:
- `loadMap(mapId)` - Load map by ID
- `getAvailableMaps()` - Get all available map IDs
- `validateMap(map)` - Validate map structure

From `@innkeeper/lib`:
- All type definitions (Entity, DungeonMap, Room, etc.)
- Event types (GameEvent, ExplorationEvent, NarrativeEvent, etc.)

## 🎯 Integration Checklist

- [ ] Update run creation to include `mapId` and `agentIds`
- [ ] Handle async `simulateRun` calls
- [ ] Display room information from map data
- [ ] Show entity `roomId` in UI
- [ ] Handle `enter_room`/`exit_room` events
- [ ] Display objectives and progress
- [ ] Show discovered rooms
- [ ] Handle narrative events from DM
- [ ] Update map visualization with room connections
- [ ] Add map selection UI

## 📞 Questions to Answer

1. **Can you load and display the maps?**
2. **Do the room structures make sense for visualization?**
3. **Are the event types sufficient for your UI needs?**
4. **Do you need additional helper functions?**
5. **Are there any TypeScript type issues?**
6. **What additional data do you need from the engine?**

## 🚨 Important Notes

- **simulateRun is now async** - Make sure to await it
- **mapId is optional** - If not provided, runs without spatial system
- **agentIds must match entity order** - First agent ID controls first entity
- **Room transitions are automatic** - Engine handles them, you just display events
- **Objectives are checked automatically** - Engine determines victory/defeat

---

**Please test the integration and report back with:**
- ✅ What works
- ❌ What doesn't work
- 🚀 What you're building
- 📝 What you need help with

Thanks! The engine is ready for your frontend magic! 🎮

