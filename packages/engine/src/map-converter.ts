/**
 * Map Converter (FIXED VERSION)
 *
 * Converts Mike's map generator format (Dungeon with multi-level structure)
 * to engine format (DungeonMap with optional multi-level support)
 * 
 * FIXES:
 * 1. Auto-detects format (Mike's vs already-converted)
 * 2. Adds missing x,y coordinates for rooms without them
 * 3. Properly flattens multi-level structure
 * 4. Generates spawn points if missing
 * 5. Handles both room.spawnPoints and top-level spawnPoints
 */

import type {
    DungeonLevel,
    DungeonMap,
    DungeonObjective,
    LevelConnection,
    MapEnemy,
    MapItem,
    Room,
    SpawnPoint,
} from '@innkeeper/lib';

// Import Mike's types (using type-only imports to avoid runtime dependency)
type MikesDungeon = {
  id: string;
  name: string;
  entranceX: number;
  entranceY: number;
  seed: string;
  type: 'dungeon' | 'tower';
  maxDepth: number;
  levels: MikesDungeonLevel[];
  worldContentId?: string;
  metadata: Record<string, unknown>;
};

type MikesDungeonLevel = {
  z: number;
  rooms: MikesRoom[];
  connections: MikesLevelConnection[];
  metadata?: Record<string, unknown>;
};

type MikesRoom = {
  id: string;
  name: string;
  description: string;
  type: 'chamber' | 'corridor' | 'boss_room' | 'treasure_room' | 'trap_room' | 'puzzle_room' | 'entrance' | 'exit';
  encounters?: MikesEncounter[];
  loot?: MikesLootEntry[];
  connections: MikesRoomConnection[];
  metadata?: Record<string, unknown>;
  // Optional coordinates that might be present
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type MikesLevelConnection = {
  fromZ: number;
  toZ: number;
  type: 'staircase' | 'ladder' | 'portal' | 'elevator';
  description: string;
};

type MikesRoomConnection = {
  targetRoomId: string;
  type: 'door' | 'corridor' | 'passage' | 'secret_passage';
  description: string;
};

type MikesEncounter = {
  id: string;
  type: 'boss' | 'monster' | 'trap' | 'puzzle' | 'event';
  name: string;
  description: string;
  worldContentId?: string;
  metadata: Record<string, unknown>;
};

type MikesLootEntry = {
  id: string;
  itemId: string;
  name: string;
  rarity: string;
  worldContentId?: string;
  metadata: Record<string, unknown>;
};

/**
 * Check if input is already in DungeonMap format
 */
function isAlreadyDungeonMap(input: any): input is DungeonMap {
  return (
    input &&
    typeof input.id === 'string' &&
    typeof input.name === 'string' &&
    Array.isArray(input.rooms) &&
    Array.isArray(input.objectives) &&
    // Check if rooms have x,y coordinates (DungeonMap format)
    input.rooms.length > 0 &&
    typeof input.rooms[0].x === 'number' &&
    typeof input.rooms[0].y === 'number'
  );
}

/**
 * Check if input is Mike's Dungeon format
 */
function isMikesDungeon(input: any): input is MikesDungeon {
  return (
    input &&
    typeof input.id === 'string' &&
    typeof input.name === 'string' &&
    Array.isArray(input.levels) &&
    typeof input.maxDepth === 'number'
  );
}

/**
 * Convert Mike's Dungeon format to engine DungeonMap format
 * Now with auto-detection and passthrough for already-converted maps
 */
export function convertDungeonToDungeonMap(input: unknown): DungeonMap {
  // If already in DungeonMap format, return as-is
  if (isAlreadyDungeonMap(input)) {
    return input;
  }

  // If it's Mike's format, convert it
  if (isMikesDungeon(input)) {
    return convertMikesDungeon(input);
  }

  // Unknown format - throw error
  throw new Error('Invalid dungeon format: must be either DungeonMap or MikesDungeon format');
}

/**
 * Convert Mike's Dungeon to DungeonMap
 */
function convertMikesDungeon(mikesDungeon: MikesDungeon): DungeonMap {
  // Convert all levels
  const levels: DungeonLevel[] = mikesDungeon.levels.map((level) => {
    const rooms = level.rooms.map((mikesRoom, index) => 
      convertRoom(mikesRoom, level.z, index, level.rooms.length)
    );

    const levelConnections: LevelConnection[] = level.connections.map((conn) => ({
      fromZ: conn.fromZ,
      toZ: conn.toZ,
      type: conn.type,
      description: conn.description,
    }));

    return {
      z: level.z,
      rooms,
      connections: levelConnections,
      metadata: level.metadata,
    };
  });

  // Flatten all rooms for backward compatibility
  const allRooms: Room[] = [];
  for (const level of levels) {
    allRooms.push(...level.rooms);
  }

  // Generate objectives from encounters
  const objectives = generateObjectives(mikesDungeon.levels);

  // Calculate map bounds
  const bounds = calculateBounds(allRooms);

  // Generate spawn points
  const spawnPoints = generateSpawnPoints(allRooms, mikesDungeon.entranceX, mikesDungeon.entranceY);

  return {
    id: mikesDungeon.id,
    name: mikesDungeon.name,
    seed: mikesDungeon.seed,
    rooms: allRooms,
    spawnPoints: spawnPoints,
    bounds: bounds,
    objectives: objectives,
    levels,
    metadata: {
      type: mikesDungeon.type,
      maxDepth: mikesDungeon.maxDepth,
      entranceX: mikesDungeon.entranceX,
      entranceY: mikesDungeon.entranceY,
      ...mikesDungeon.metadata,
    },
  };
}

/**
 * Convert Mike's Room to engine Room format
 * FIXED: Properly generates x,y coordinates for rooms without them
 */
function convertRoom(mikesRoom: MikesRoom, z: number, index: number, totalRooms: number): Room {
  // Generate grid layout if x/y not provided
  let x: number;
  let y: number;
  let width: number;
  let height: number;

  if (mikesRoom.x !== undefined && mikesRoom.y !== undefined) {
    // Use provided coordinates
    x = mikesRoom.x;
    y = mikesRoom.y;
    width = mikesRoom.width ?? 100;
    height = mikesRoom.height ?? 100;
  } else {
    // Calculate grid position
    const gridSize = Math.ceil(Math.sqrt(totalRooms));
    const row = Math.floor(index / gridSize);
    const col = index % gridSize;

    const roomWidth = 120;
    const roomHeight = 120;
    const padding = 30;

    x = col * (roomWidth + padding) + 50;
    y = row * (roomHeight + padding) + 50;
    width = roomWidth;
    height = roomHeight;
  }

  // Convert encounters to enemies
  const enemies: MapEnemy[] = (mikesRoom.encounters || [])
    .filter((enc) => enc.type === 'monster' || enc.type === 'boss')
    .map((enc) => ({
      id: enc.id,
      name: enc.name,
      type: enc.name.toLowerCase(),
      worldContentId: enc.worldContentId,
      metadata: enc.metadata,
    }));

  // Convert loot to items
  const items: MapItem[] = (mikesRoom.loot || []).map((lootEntry) => ({
    id: lootEntry.id,
    itemId: lootEntry.itemId,
    name: lootEntry.name,
    rarity: lootEntry.rarity,
    worldContentId: lootEntry.worldContentId,
    metadata: lootEntry.metadata,
  }));

  // Generate spawn points for this room (center of room)
  const spawnPoints: SpawnPoint[] = [{
    x: x + width / 2,
    y: y + height / 2,
    z: z || 0,
  }];

  return {
    id: mikesRoom.id,
    name: mikesRoom.name,
    description: mikesRoom.description,
    type: mikesRoom.type as Room['type'],
    x,
    y,
    z: z || 0,
    width,
    height,
    enemies,
    items,
    connections: mikesRoom.connections.map((conn) => conn.targetRoomId),
    spawnPoints, // Each room should have spawn points
    metadata: {
      originalType: mikesRoom.type,
      connectionDetails: mikesRoom.connections,
      ...mikesRoom.metadata,
    },
  };
}

/**
 * Generate spawn points from rooms
 * FIXED: Uses entrance coordinates or finds entrance rooms
 */
function generateSpawnPoints(rooms: Room[], entranceX?: number, entranceY?: number): SpawnPoint[] {
  // If entrance coordinates provided, use them
  if (entranceX !== undefined && entranceY !== undefined) {
    return [{ x: entranceX, y: entranceY, z: 0 }];
  }

  // Find entrance rooms
  const entranceRooms = rooms.filter((r) => r.type === 'entrance');

  if (entranceRooms.length > 0) {
    return entranceRooms.map((room) => ({
      x: room.x + room.width / 2,
      y: room.y + room.height / 2,
      z: room.z || 0,
    }));
  }

  // Fallback: use first room
  if (rooms.length > 0) {
    const firstRoom = rooms[0];
    return [
      {
        x: firstRoom.x + firstRoom.width / 2,
        y: firstRoom.y + firstRoom.height / 2,
        z: firstRoom.z || 0,
      },
    ];
  }

  // Fallback: default position
  return [{ x: 100, y: 100, z: 0 }];
}

/**
 * Generate objectives from level data
 */
function generateObjectives(levels: MikesDungeonLevel[]): DungeonObjective[] {
  const objectives: DungeonObjective[] = [];

  // Add a boss objective if there are any boss encounters
  const hasBoss = levels.some((level) =>
    level.rooms.some(
      (room) =>
        room.encounters?.some((enc) => enc.type === 'boss') ||
        room.type === 'boss_room'
    )
  );

  if (hasBoss) {
    objectives.push({
      id: 'defeat-boss',
      type: 'defeat_enemy',
      description: 'Defeat the dungeon boss',
      target: 'boss',
    });
  }

  // Add a treasure objective if there are treasure rooms
  const hasTreasure = levels.some((level) =>
    level.rooms.some((room) => room.type === 'treasure_room')
  );

  if (hasTreasure) {
    objectives.push({
      id: 'collect-treasure',
      type: 'collect_item',
      description: 'Collect treasure from the treasure room',
      target: 'treasure',
    });
  }

  // Fallback: explore objective
  if (objectives.length === 0) {
    objectives.push({
      id: 'explore-dungeon',
      type: 'explore',
      description: 'Explore the dungeon',
      target: 'explore',
    });
  }

  return objectives;
}

/**
 * Calculate map bounds from rooms
 */
function calculateBounds(rooms: Room[]) {
  if (rooms.length === 0) {
    return { minX: 0, maxX: 500, minY: 0, maxY: 500 };
  }

  const minX = Math.min(...rooms.map((r) => r.x));
  const maxX = Math.max(...rooms.map((r) => r.x + r.width));
  const minY = Math.min(...rooms.map((r) => r.y));
  const maxY = Math.max(...rooms.map((r) => r.y + r.height));

  return { minX, maxX, minY, maxY };
}
