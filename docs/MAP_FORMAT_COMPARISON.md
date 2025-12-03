# Map Format Comparison: Mike's Generator vs Engine

## Overview

Mike's map generator produces a different structure than what the engine expects. This document details the differences and conversion requirements.

## Format Comparison

### Mike's Generator Format (`map-generation.ts`)

```typescript
// Multi-level dungeon structure
Dungeon {
  id: string
  name: string
  entranceX: number
  entranceY: number
  seed: string
  type: 'dungeon' | 'tower'
  maxDepth: number  // ~100 levels
  levels: DungeonLevel[]  // Array of z-levels
  worldContentId?: string
  metadata: Record<string, unknown>
}

DungeonLevel {
  z: number  // Negative for dungeons, positive for towers
  rooms: Room[]  // Rooms at this level
  connections: LevelConnection[]  // Stairs/portals to other levels
  metadata: Record<string, unknown>
}

Room {
  id: string
  name: string
  description: string
  type: RoomType  // 'chamber' | 'corridor' | 'boss_room' | etc.
  encounters?: Encounter[]
  loot?: LootEntry[]
  connections: RoomConnection[]  // Connections to other rooms
  metadata: Record<string, unknown>
}

RoomConnection {
  targetRoomId: string
  type: 'door' | 'corridor' | 'passage' | 'secret_passage'
  description: string
}
```

### Engine Format (`dungeon.ts`)

```typescript
// Single-level dungeon structure
DungeonMap {
  id: string
  name: string
  seed: string
  rooms: Room[]  // Flat array, no z-levels
  width: number
  height: number
  objectives: DungeonObjective[]
}

Room {
  id: string
  x: number  // Position coordinates
  y: number
  width: number
  height: number
  type: 'room' | 'corridor' | 'chamber' | 'boss'
  connections: string[]  // Array of room IDs (simpler)
  spawnPoints: SpawnPoint[]
  items: MapItem[]
  enemies: MapEnemy[]
  entities?: string[]  // Entity IDs currently in room
}

SpawnPoint {
  x: number
  y: number
}

MapEnemy {
  id: string
  name: string
  stats: EntityStats
}

DungeonObjective {
  type: 'defeat_boss' | 'retrieve_item' | 'clear_room' | 'survive'
  target: string  // Entity ID or item ID
}
```

## Key Differences

### 1. Multi-Level vs Single-Level

**Mike's Format**:
- Supports z-levels (depth/height)
- Each level has its own rooms
- Levels connected via `LevelConnection`

**Engine Format**:
- Single flat array of rooms
- No z-level concept
- All rooms at same "level"

### 2. Room Structure

**Mike's Format**:
- No position coordinates (x, y, width, height)
- Has `encounters` array (abstract)
- Has `loot` array (abstract)
- Connections are objects with type/description

**Engine Format**:
- Requires position coordinates
- Has `enemies` array (concrete entities)
- Has `items` array (concrete items)
- Connections are simple string arrays

### 3. Objectives

**Mike's Format**:
- No objectives defined
- Objectives would need to be inferred from encounters/loot

**Engine Format**:
- Explicit `objectives` array
- Required for victory conditions

### 4. Spawn Points

**Mike's Format**:
- No spawn points defined
- Would need to be generated

**Engine Format**:
- Explicit `spawnPoints` array
- Required for entity placement

## Conversion Strategy

### Option 1: Flatten Multi-Level Dungeon

Convert Mike's multi-level dungeon to single-level by:
1. Taking first level (z = -1 for dungeons, z = 1 for towers)
2. Flattening all rooms into single array
3. Generating positions for rooms
4. Converting encounters to enemies
5. Converting loot to items
6. Generating spawn points
7. Creating objectives from encounters

**Pros**:
- Works with existing engine
- Simple conversion

**Cons**:
- Loses multi-level structure
- Can't navigate between levels
- Limited dungeon depth

### Option 2: Extend Engine to Support Multi-Level

Modify engine to support:
1. Add `z` coordinate to `Position`
2. Add `level` field to `DungeonState`
3. Modify spatial system to handle level transitions
4. Update room connections to include level info
5. Add level transition actions

**Pros**:
- Preserves full dungeon structure
- Enables deeper dungeons
- More realistic navigation

**Cons**:
- Requires engine changes
- More complex implementation
- Breaking change

### Option 3: Hybrid Approach

1. Convert first level to `DungeonMap` format
2. Store full `Dungeon` structure separately
3. When party reaches level boundary, load next level
4. Convert next level on-the-fly

**Pros**:
- Works with current engine
- Preserves multi-level structure
- Can add multi-level support later

**Cons**:
- Complex state management
- Level transitions need special handling

## Recommended Approach: Option 1 (Initial) + Option 3 (Future)

### Phase 1: Flatten for Playability
- Convert first level to `DungeonMap`
- Get agents playing immediately
- Generate spawn points and objectives

### Phase 2: Add Multi-Level Support
- Extend engine for z-levels
- Add level transition mechanics
- Preserve full dungeon structure

## Conversion Implementation

### Required Converter Function

```typescript
function convertDungeonToDungeonMap(
  dungeon: Dungeon,
  levelZ: number = -1  // Default to first dungeon level
): DungeonMap {
  // Find the level
  const level = dungeon.levels.find(l => l.z === levelZ);
  if (!level) {
    throw new Error(`Level ${levelZ} not found`);
  }

  // Convert rooms
  const rooms: Room[] = level.rooms.map((room, index) => {
    // Generate position (grid layout)
    const cols = Math.ceil(Math.sqrt(level.rooms.length));
    const row = Math.floor(index / cols);
    const col = index % cols;
    const roomSize = 100;  // Default room size
    const spacing = 150;

    return {
      id: room.id,
      x: col * spacing,
      y: row * spacing,
      width: roomSize,
      height: roomSize,
      type: convertRoomType(room.type),
      connections: room.connections.map(c => c.targetRoomId),
      spawnPoints: generateSpawnPoints(room, roomSize),
      items: convertLootToItems(room.loot),
      enemies: convertEncountersToEnemies(room.encounters),
    };
  });

  // Generate objectives
  const objectives = generateObjectives(level.rooms);

  // Calculate bounds
  const bounds = calculateBounds(rooms);

  return {
    id: dungeon.id,
    name: dungeon.name,
    seed: dungeon.seed,
    rooms,
    width: bounds.width,
    height: bounds.height,
    objectives,
  };
}
```

### Helper Functions Needed

1. `convertRoomType()` - Map RoomType to engine Room type
2. `generateSpawnPoints()` - Create spawn points in room
3. `convertLootToItems()` - Convert LootEntry[] to MapItem[]
4. `convertEncountersToEnemies()` - Convert Encounter[] to MapEnemy[]
5. `generateObjectives()` - Create objectives from encounters
6. `calculateBounds()` - Calculate map width/height

## Missing Data Generation

### Spawn Points
- Generate 1-3 spawn points per room
- Place near room center or entry points
- Ensure valid coordinates within room bounds

### Objectives
- If boss encounter exists → `defeat_boss` objective
- If treasure room exists → `retrieve_item` objective
- Default → `clear_room` or `survive`

### Enemy Stats
- Need to convert `Encounter` to `MapEnemy` with stats
- May need stat generation based on encounter type
- Use encounter metadata if available

### Item Details
- Convert `LootEntry` to `MapItem`
- Map rarity to item properties
- Generate item IDs if missing

## Integration Points

### Map Loader Integration

```typescript
// In map-loader.ts
export async function loadGeneratedMap(
  dungeonId: string,
  levelZ: number = -1
): Promise<DungeonMap | null> {
  // Load from MapGenerator
  const mapGenerator = new MapGenerator();
  const dungeon = await mapGenerator.getDungeon(entranceX, entranceY, levelZ);

  if (!dungeon) {
    return null;
  }

  // Convert to engine format
  return convertDungeonToDungeonMap(dungeon, levelZ);
}
```

### Engine Integration

```typescript
// In engine.ts createEngineState()
if (config.mapId) {
  // Check if it's a generated map
  if (config.mapId.startsWith('generated-')) {
    const map = await loadGeneratedMap(config.mapId, config.levelZ);
  } else {
    const map = loadMap(config.mapId);
  }
  // ... rest of initialization
}
```

## Testing Requirements

1. **Conversion Tests**:
   - Test dungeon → DungeonMap conversion
   - Verify all rooms converted
   - Verify spawn points generated
   - Verify objectives created

2. **Integration Tests**:
   - Test map loading from generator
   - Test entity placement
   - Test room transitions
   - Test objective completion

3. **Edge Cases**:
   - Empty dungeon
   - Single room dungeon
   - No encounters
   - No loot
   - Missing connections
