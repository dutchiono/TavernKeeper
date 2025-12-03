# Map Generator System

## What This Does

This contribution provides a map generator and data structure system for the game world. The system manages a 2D infinite grid for the surface world and a 3D coordinate system for dungeons and towers, creating a persistent, shared world map that all players experience.

The map system:
- **Surface World**: 2D infinite grid where each cell can represent features of any size (from a hermit's cabin to an entire capital city)
- **Dungeon/Tower System**: 3D coordinates with Z-levels representing depth (dungeons) or height (towers), typically ~100 layers deep
- **Pre-Generation**: Uses `@world-generation-system` to generate continents, kingdoms, necromancer towers, orc hordes, and other features
- **On-the-Fly Generation**: Allows players to explore new areas, generating them dynamically and permanently stamping them into the world
- **Pseudo-Permanent**: Map is shared across all players - if a dungeon exists at (-10, 4), it exists for everyone
- **Provenance Integration**: Uses `@world-content-hierarchy` to track the history and lore of map features

## Key Concepts

### Grid-Based Surface World

The surface world uses a 2D infinite grid where:
- Each cell has coordinates (x, y)
- Cells have no fixed size or distance between them
- The grid suggests that there are things between any two points
- Features can span multiple cells or be contained in a single cell
- A capital city might occupy one cell, while a hermit's cabin occupies another

### Z-Level System

The third dimension (z) represents:
- **Dungeons**: Negative z-values, going down from the surface (z = 0)
- **Towers**: Positive z-values, going up from the surface
- Typically ~100 layers deep for dungeons
- Each z-level can contain rooms, encounters, and features

### Map Features

Surface features include:
- **Geographical**: Continents, islands, volcanoes, mountain ranges (from world-generation-system Geography)
- **Organizations**: Kingdoms, necromancer towers, orc hordes, graveyards, towns (from world-generation-system Organizations)
- **Dungeon Entrances**: Points where players can enter dungeons
- **Landmarks**: Unique locations with special significance

## Where It Should Be Integrated

### Type Definitions
- `packages/lib/src/types/map-generation.ts` - Map generation types and interfaces
- `packages/lib/src/index.ts` - Export new types

### Map Generator System
- `packages/engine/src/map-generation/` - New directory for map generation
  - `map-generator.ts` - Main map generator
  - `surface-generator.ts` - Generates surface features
  - `dungeon-generator.ts` - Generates dungeon structures
  - `map-storage.ts` - Manages map persistence

### Integration Points
- `packages/engine/src/world-generation/` - Use geography and organization generators
- `packages/engine/src/world-content/` - Use world content hierarchy for provenance
- `apps/web/lib/services/mapService.ts` - Service for querying map data
- `apps/web/app/api/map/route.ts` - API endpoints for map queries
- `apps/web/app/api/map/explore/route.ts` - API endpoint for on-the-fly generation

### Database Schema
- `supabase/migrations/YYYYMMDDHHMMSS_map_data.sql` - Tables for map storage
- Extends world-content-hierarchy tables for map-specific data

## How to Test

### Unit Tests
1. Test map cell generation and storage
2. Test surface feature placement
3. Test dungeon generation at specific coordinates
4. Test on-the-fly generation
5. Test map queries by coordinate ranges

### Integration Tests
1. Generate a map region with pre-generated features
2. Explore a new area and verify it's generated and stored
3. Query map features by location
4. Verify integration with world-generation-system
5. Verify integration with world-content-hierarchy

### Manual Testing
1. Generate initial map with seed
2. Query surface features at specific coordinates
3. Explore a new area and verify generation
4. Query dungeon structure at a location
5. Verify map persistence across sessions

## Dependencies

- Integrates with `world-generation-system` contribution (Geography, Organizations)
- Integrates with `world-content-hierarchy` contribution (provenance, lore)
- Uses existing database connection (Supabase)
- May use seeded RNG for deterministic generation

## Breaking Changes

None - this is an additive feature that extends the world generation and content hierarchy systems.

## Design Decisions

1. **Infinite Grid**: Surface world uses an infinite 2D grid to allow unlimited exploration
2. **Cell Flexibility**: Cells have no fixed size, allowing features of any scale
3. **Pseudo-Permanent**: Map is shared across all players for consistency
4. **On-the-Fly Generation**: New areas are generated when explored and permanently stored
5. **Z-Level System**: Third dimension for dungeons/towers with ~100 layer depth
6. **Integration**: Leverages existing world-generation and world-content systems

## Map Structure

```
Surface World (2D Grid)
├── Cell (x, y)
│   ├── Surface Features
│   │   ├── Geography (continents, islands, etc.)
│   │   ├── Organizations (kingdoms, towers, etc.)
│   │   └── Landmarks
│   └── Dungeon Entrance (z = 0)
│       └── Dungeon (z < 0, up to ~100 levels)
│           ├── Level -1
│           ├── Level -2
│           └── ...
│       └── Tower (z > 0, up to ~100 levels)
│           ├── Level 1
│           ├── Level 2
│           └── ...
```

## Code Structure

```
contributions/map-generator-system/
├── README.md (this file)
├── DESIGN.md (design overview)
├── code/
│   ├── types/
│   │   └── map-generation.ts      # Map types and interfaces
│   ├── generators/
│   │   ├── map-generator.ts        # Main generator
│   │   ├── surface-generator.ts    # Surface feature generation
│   │   └── dungeon-generator.ts    # Dungeon/tower generation
│   └── storage/
│       └── map-storage.ts          # Map persistence
└── examples/
    └── usage-examples.ts           # Integration examples
```

## Integration Example

```typescript
import { MapGenerator } from '@innkeeper/engine/map-generation';
import { WorldGenerator } from '@innkeeper/engine/world-generation';
import { WorldManager } from '@innkeeper/engine/world-content';

const mapGenerator = new MapGenerator();
const worldGenerator = new WorldGenerator();
const worldManager = new WorldManager();

// Pre-generate initial map region
await mapGenerator.generateInitialMap({
  seed: 'world-seed',
  region: { xMin: -50, xMax: 50, yMin: -50, yMax: 50 },
  worldGenerator,
  worldManager,
});

// Query surface features at a location
const cell = await mapGenerator.getCell(10, -5);
console.log(cell.features); // Geography, organizations, etc.

// Explore new area (on-the-fly generation)
const newCell = await mapGenerator.exploreCell(100, 100, {
  worldGenerator,
  worldManager,
});

// Get dungeon at location
const dungeon = await mapGenerator.getDungeon(10, -5, -1);
console.log(dungeon.rooms); // Dungeon structure
```

## Notes

- Map generation is deterministic based on seeds
- Surface features are generated using world-generation-system
- Map features have provenance tracked via world-content-hierarchy
- On-the-fly generation creates permanent map entries
- Map is queryable by coordinates and feature types
- Z-levels are typically ~100 layers deep for dungeons

