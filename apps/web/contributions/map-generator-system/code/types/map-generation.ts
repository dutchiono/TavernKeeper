/**
 * Map Generation Types
 * 
 * Defines the structure for the map generator system, including
 * surface world cells, features, dungeons, and z-levels.
 */

/**
 * Types of surface features on the map
 */
export type FeatureType =
  | 'geography' // Continents, islands, volcanoes, etc.
  | 'organization' // Kingdoms, towers, hordes, etc.
  | 'landmark' // Unique locations
  | 'dungeon_entrance' // Entry point to a dungeon
  | 'ruin' // Abandoned structures
  | 'trading_post' // Commerce locations
  | 'generated'; // Dynamically generated features

/**
 * Source of a map feature
 */
export type FeatureSource =
  | 'geography' // From world-generation-system Geography
  | 'organization' // From world-generation-system Organizations
  | 'landmark' // Unique landmark
  | 'generated'; // On-the-fly generated

/**
 * A cell in the 2D surface world grid
 */
export interface MapCell {
  id: string;
  x: number;
  y: number;
  seed: string; // Deterministic seed for this cell
  features: MapFeature[];
  dungeonEntrances: DungeonEntrance[];
  discoveredAt: Date;
  discoveredBy?: string[]; // Player/agent IDs who first discovered
  worldContentId?: string; // Link to world-content-hierarchy
  metadata: Record<string, unknown>;
}

/**
 * A feature within a map cell
 */
export interface MapFeature {
  id: string;
  type: FeatureType;
  name: string;
  description: string;
  source: FeatureSource;
  sourceId?: string; // ID from world-generation-system (if applicable)
  worldContentId?: string; // Link to world-content-hierarchy
  metadata: Record<string, unknown>;
}

/**
 * Entry point to a dungeon or tower
 */
export interface DungeonEntrance {
  id: string;
  name: string;
  description: string;
  surfaceX: number;
  surfaceY: number;
  dungeonId: string;
  worldContentId?: string;
  metadata: Record<string, unknown>;
}

/**
 * A dungeon or tower structure
 */
export interface Dungeon {
  id: string;
  name: string;
  entranceX: number;
  entranceY: number;
  seed: string;
  type: 'dungeon' | 'tower';
  maxDepth: number; // Maximum z-levels (typically ~100)
  levels: DungeonLevel[];
  worldContentId?: string;
  metadata: Record<string, unknown>;
}

/**
 * A single z-level in a dungeon or tower
 */
export interface DungeonLevel {
  z: number; // Negative for dungeons, positive for towers
  rooms: Room[];
  connections: LevelConnection[];
  metadata: Record<string, unknown>;
}

/**
 * A room within a dungeon level
 */
export interface Room {
  id: string;
  name: string;
  description: string;
  type: RoomType;
  encounters?: Encounter[];
  loot?: LootEntry[];
  connections: RoomConnection[];
  metadata: Record<string, unknown>;
}

/**
 * Types of rooms
 */
export type RoomType =
  | 'chamber'
  | 'corridor'
  | 'boss_room'
  | 'treasure_room'
  | 'trap_room'
  | 'puzzle_room'
  | 'entrance'
  | 'exit';

/**
 * Connection between dungeon levels
 */
export interface LevelConnection {
  fromZ: number;
  toZ: number;
  type: 'staircase' | 'ladder' | 'portal' | 'elevator';
  description: string;
}

/**
 * Connection between rooms
 */
export interface RoomConnection {
  targetRoomId: string;
  type: 'door' | 'corridor' | 'passage' | 'secret_passage';
  description: string;
}

/**
 * An encounter in a room
 */
export interface Encounter {
  id: string;
  type: 'boss' | 'monster' | 'trap' | 'puzzle' | 'event';
  name: string;
  description: string;
  worldContentId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Loot entry in a room
 */
export interface LootEntry {
  id: string;
  itemId: string;
  name: string;
  rarity: string;
  worldContentId?: string;
  metadata: Record<string, unknown>;
}

/**
 * Coordinate pair for 2D surface
 */
export interface SurfaceCoordinate {
  x: number;
  y: number;
}

/**
 * Coordinate triple for 3D (including z-level)
 */
export interface MapCoordinate extends SurfaceCoordinate {
  z: number; // 0 for surface, negative for dungeons, positive for towers
}

/**
 * Region bounds for querying
 */
export interface MapRegion {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * Options for generating initial map
 */
export interface InitialMapOptions {
  seed: string;
  region: MapRegion;
  density?: 'sparse' | 'normal' | 'dense';
  includeDungeons?: boolean;
}

/**
 * Options for exploring a new cell
 */
export interface ExploreCellOptions {
  seed?: string; // Optional override, otherwise uses coordinate-based seed
  generateDungeon?: boolean; // Whether to generate dungeon entrance
  worldGenerator?: unknown; // WorldGenerator instance
  worldManager?: unknown; // WorldManager instance
}

/**
 * Options for generating a dungeon
 */
export interface DungeonGenerationOptions {
  seed: string;
  entranceX: number;
  entranceY: number;
  type: 'dungeon' | 'tower';
  depth?: number; // Number of z-levels (default ~100)
  worldManager?: unknown; // WorldManager instance
}

/**
 * Query options for map data
 */
export interface MapQuery {
  region?: MapRegion;
  featureTypes?: FeatureType[];
  hasDungeon?: boolean;
  discoveredBy?: string[];
  worldContentId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Result of map query
 */
export interface MapQueryResult {
  cells: MapCell[];
  total: number;
  hasMore: boolean;
}

/**
 * Cell generation context
 */
export interface CellGenerationContext {
  seed: string;
  x: number;
  y: number;
  nearbyCells?: MapCell[]; // Nearby cells for context
  worldGenerator?: unknown; // WorldGenerator instance
  worldManager?: unknown; // WorldManager instance
}

