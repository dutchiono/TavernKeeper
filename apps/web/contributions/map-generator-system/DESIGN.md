# Map Generator System - Design Overview

## Problem Statement

The game needs a map generator and data structure system that:
1. Represents the surface world as a 2D infinite grid where cells can contain features of any size
2. Supports a third dimension (Z-levels) for dungeons (~100 layers deep) and towers
3. Integrates with world-generation-system for pre-generated features (Geography, Organizations)
4. Integrates with world-content-hierarchy for provenance and lore
5. Allows on-the-fly generation when players explore new areas
6. Maintains a pseudo-permanent map shared across all players

## Solution Design

### Surface World: 2D Infinite Grid

The surface world is represented as an infinite 2D grid where:
- **Coordinates**: Each cell has (x, y) coordinates
- **No Fixed Size**: Cells have no inherent size or distance between them
- **Feature Flexibility**: A single cell can represent a capital city or a hermit's cabin
- **Spatial Suggestion**: The grid suggests there are things between any two points
- **Feature Placement**: Features are placed deterministically based on seeds

**Key Insight**: The grid is not about precise distance measurement, but about spatial relationships and the suggestion of content between points.

### Z-Level System: Third Dimension

The Z-axis represents vertical depth/height:
- **Surface**: z = 0
- **Dungeons**: z < 0 (negative values, going down)
  - Typically ~100 layers deep
  - Each level can contain rooms, encounters, loot
- **Towers**: z > 0 (positive values, going up)
  - Can also be ~100 levels high
  - Each level represents a floor

**Example**:
- Surface cell at (10, -5) might have a dungeon entrance
- The dungeon extends to z = -1, -2, -3, ..., -100
- Each z-level is a distinct dungeon floor

### Map Features

#### Surface Features

Surface features are generated using `world-generation-system`:

**From Geography (Level 2.5)**:
- Continents
- Islands
- Volcanoes
- Mountain ranges
- Rivers
- Forests
- Deserts
- Underground systems

**From Organizations (Level 6)**:
- Kingdoms
- Necromancer towers
- Orc hordes
- Graveyards
- Towns
- Guilds
- Bands

**Additional Features**:
- Dungeon entrances
- Landmarks
- Ruins
- Trading posts

#### Dungeon Features

Dungeons contain:
- **Rooms**: Individual areas within a z-level
- **Encounters**: Bosses, events, challenges
- **Loot**: Items found in the dungeon
- **Connections**: Stairs, portals between levels

### Generation Process

#### Pre-Generation (Initial Map)

1. **Generate World Context**:
   - Use `world-generation-system` to generate Geography and Organizations
   - Establish world seed and context

2. **Place Surface Features**:
   - Determine feature locations based on seed
   - Place geographical features (continents, islands, etc.)
   - Place organizational features (kingdoms, towers, etc.)
   - Create dungeon entrances at appropriate locations

3. **Generate Dungeons**:
   - For each dungeon entrance, generate dungeon structure
   - Create z-levels (typically ~100 deep)
   - Populate with rooms, encounters, loot

4. **Store Map Data**:
   - Save all features to database
   - Link to world-content-hierarchy for provenance
   - Create world content entries for each feature

#### On-the-Fly Generation (Exploration)

When a player explores a new area:

1. **Check if Cell Exists**:
   - Query database for cell at (x, y)
   - If exists, return existing data

2. **Generate New Cell**:
   - Use seed based on coordinates
   - Generate appropriate features for the area
   - Use world-generation-system for context
   - Create world-content-hierarchy entries

3. **Store Permanently**:
   - Save cell data to database
   - Mark as explored
   - Link to world content

4. **Return to Player**:
   - Return generated cell data
   - Include all features and dungeon entrances

### Data Model

#### MapCell

Represents a single cell in the 2D grid:

```typescript
interface MapCell {
  id: string;
  x: number;
  y: number;
  seed: string; // Deterministic seed for this cell
  features: MapFeature[];
  dungeonEntrances: DungeonEntrance[];
  discoveredAt: Date;
  discoveredBy?: string[]; // Player/agent IDs
  worldContentId?: string; // Link to world-content-hierarchy
}
```

#### MapFeature

A feature within a cell:

```typescript
interface MapFeature {
  id: string;
  type: FeatureType;
  name: string;
  description: string;
  source: 'geography' | 'organization' | 'landmark' | 'generated';
  sourceId?: string; // ID from world-generation-system
  worldContentId?: string; // Link to world-content-hierarchy
  metadata: Record<string, unknown>;
}
```

#### DungeonEntrance

Entry point to a dungeon:

```typescript
interface DungeonEntrance {
  id: string;
  name: string;
  description: string;
  surfaceX: number;
  surfaceY: number;
  dungeonId: string;
  worldContentId?: string;
}
```

#### Dungeon

A dungeon structure:

```typescript
interface Dungeon {
  id: string;
  name: string;
  entranceX: number;
  entranceY: number;
  seed: string;
  levels: DungeonLevel[]; // z = -1 to -100
  worldContentId?: string;
}
```

#### DungeonLevel

A single z-level in a dungeon:

```typescript
interface DungeonLevel {
  z: number; // Negative for dungeons
  rooms: Room[];
  connections: LevelConnection[]; // Stairs, portals
}
```

### Integration with World Generation System

The map generator uses `world-generation-system`:

1. **Geography Generator**:
   - Generates continents, islands, volcanoes, etc.
   - Provides locations and descriptions
   - Map generator places these on the grid

2. **Organization Generator**:
   - Generates kingdoms, towers, hordes, etc.
   - Provides organizational context
   - Map generator places these on the grid

3. **Deterministic Placement**:
   - Features are placed based on world seed
   - Same seed = same feature locations
   - Coordinates are determined algorithmically

### Integration with World Content Hierarchy

The map generator uses `world-content-hierarchy`:

1. **Provenance Tracking**:
   - Each map feature has a world content entry
   - Tracks origin, creator, history
   - Links to parent geography/organizations

2. **Lore Generation**:
   - Each feature has generated lore
   - Describes history and significance
   - Connects to related features

3. **Player Impact**:
   - When players explore/clear dungeons, world content is updated
   - Player actions are recorded in provenance
   - Future players see how previous players impacted the world

### Pseudo-Permanent Map

The map is shared across all players:

- **Consistent Experience**: All players see the same map
- **Shared Discoveries**: When one player explores an area, it's available to all
- **Player Impact**: Player actions (clearing dungeons, etc.) are visible to all
- **Provenance**: Players can see how other players impacted locations

**Example**:
- Player A explores cell (100, 100) and finds a dungeon
- Player B later visits (100, 100) and sees the same dungeon
- If Player A cleared the dungeon, Player B sees evidence of that in the lore

### Query Interface

The map system provides rich querying:

1. **By Coordinates**:
   - Get cell at (x, y)
   - Get cells in region (xMin, xMax, yMin, yMax)
   - Get features at location

2. **By Feature Type**:
   - Find all kingdoms
   - Find all dungeon entrances
   - Find all necromancer towers

3. **By World Content**:
   - Query by provenance
   - Query by lore
   - Query by connections

4. **Dungeon Queries**:
   - Get dungeon at entrance
   - Get specific z-level
   - Get dungeon structure

### Storage Strategy

Map data is stored in the database:

1. **Cell Storage**:
   - Store cells as they're generated
   - Index by (x, y) for fast lookup
   - Store features and dungeon entrances

2. **Dungeon Storage**:
   - Store dungeon structures
   - Index by entrance coordinates
   - Store z-levels and rooms

3. **World Content Links**:
   - Link map features to world-content-hierarchy
   - Maintain bidirectional references
   - Enable rich querying

### Performance Considerations

1. **Lazy Loading**:
   - Only generate cells when needed
   - Cache frequently accessed cells
   - Batch queries when possible

2. **Deterministic Generation**:
   - Same coordinates + seed = same features
   - Can regenerate on-demand
   - No need to store every possible cell

3. **Spatial Indexing**:
   - Use database spatial indexes
   - Optimize region queries
   - Cache nearby cells

### Example Scenarios

#### Scenario 1: Initial Map Generation

1. System generates world with seed "my-world"
2. Geography generator creates continents, islands, etc.
3. Organization generator creates kingdoms, towers, etc.
4. Map generator places features on grid:
   - Continent "Northern Wastes" at cells (0-50, 0-50)
   - Kingdom "Aetheria" at cell (25, 25)
   - Necromancer Tower at cell (-10, 4)
   - Dungeon entrance at cell (15, -20)
5. All features are stored and linked to world content

#### Scenario 2: Player Exploration

1. Player explores cell (200, 200) - not yet generated
2. System generates cell using seed based on coordinates
3. Determines appropriate features (maybe a small forest, a trading post)
4. Creates dungeon entrance if appropriate
5. Stores cell permanently
6. Links to world content hierarchy
7. Returns cell data to player

#### Scenario 3: Dungeon Exploration

1. Player enters dungeon at (15, -20)
2. System loads dungeon structure (or generates if needed)
3. Player explores z-level -1, -2, -3
4. Player clears dungeon, defeats boss
5. World content is updated with player's actions
6. Future players see evidence of this clearing in the lore

### Benefits

1. **Infinite World**: Grid allows unlimited exploration
2. **Flexible Features**: Cells can represent any scale
3. **Rich Integration**: Uses existing world generation and content systems
4. **Shared Experience**: All players see the same world
5. **Player Impact**: Actions are recorded and visible to all
6. **Deterministic**: Reproducible world generation
7. **On-Demand**: Generate only what's needed

### Future Enhancements

- Dynamic world events that modify the map
- Map visualization tools
- Pathfinding between cells
- Distance calculations (even if approximate)
- Map regions and biomes
- Weather and environmental effects
- Trade routes and connections

