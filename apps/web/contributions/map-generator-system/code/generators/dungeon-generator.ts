/**
 * Dungeon Generator
 * 
 * Generates dungeon and tower structures with z-levels.
 * Typically generates ~100 layers deep for dungeons.
 */

import type {
  Dungeon,
  DungeonLevel,
  Room,
  DungeonGenerationOptions,
  RoomType,
} from '../types/map-generation';

export class DungeonGenerator {
  /**
   * Generate a dungeon or tower structure
   */
  async generate(options: DungeonGenerationOptions): Promise<Dungeon> {
    const {
      seed,
      entranceX,
      entranceY,
      type,
      depth = 100,
      worldManager,
    } = options;

    const levels: DungeonLevel[] = [];
    const rng = this.createRNG(seed);

    // Generate each z-level
    for (let z = type === 'dungeon' ? -1 : 1; 
         Math.abs(z) <= depth; 
         z += type === 'dungeon' ? -1 : 1) {
      const level = await this.generateLevel(z, seed, rng, worldManager);
      levels.push(level);
    }

    // Create dungeon
    const dungeon: Dungeon = {
      id: `dungeon-${entranceX}-${entranceY}-${type}`,
      name: this.generateDungeonName(type, seed),
      entranceX,
      entranceY,
      seed,
      type,
      maxDepth: depth,
      levels,
      worldContentId: undefined,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    };

    return dungeon;
  }

  /**
   * Generate a single z-level
   */
  private async generateLevel(
    z: number,
    seed: string,
    rng: () => number,
    worldManager?: unknown
  ): Promise<DungeonLevel> {
    const levelSeed = `${seed}-z${z}`;
    const roomCount = Math.floor(rng() * 10) + 5; // 5-14 rooms per level
    const rooms: Room[] = [];

    // Generate rooms
    for (let i = 0; i < roomCount; i++) {
      const room = this.generateRoom(i, levelSeed, rng, z);
      rooms.push(room);
    }

    // Create connections between rooms
    this.connectRooms(rooms, rng);

    // Create level connections (stairs to adjacent levels)
    const connections = this.generateLevelConnections(z);

    return {
      z,
      rooms,
      connections,
      metadata: {
        roomCount,
      },
    };
  }

  /**
   * Generate a room
   */
  private generateRoom(
    index: number,
    levelSeed: string,
    rng: () => number,
    z: number
  ): Room {
    const roomTypes: RoomType[] = [
      'chamber',
      'corridor',
      'boss_room',
      'treasure_room',
      'trap_room',
      'puzzle_room',
    ];

    // First room is entrance, last might be boss
    let type: RoomType = 'chamber';
    if (index === 0) {
      type = 'entrance';
    } else if (index === 1 && rng() < 0.1) {
      type = 'boss_room';
    } else {
      type = roomTypes[Math.floor(rng() * (roomTypes.length - 1))];
    }

    const room: Room = {
      id: `room-${levelSeed}-${index}`,
      name: this.generateRoomName(type, index),
      description: this.generateRoomDescription(type, z),
      type,
      encounters: this.generateEncounters(type, rng),
      loot: this.generateLoot(type, rng),
      connections: [],
      metadata: {
        index,
        z,
      },
    };

    return room;
  }

  /**
   * Connect rooms within a level
   */
  private connectRooms(rooms: Room[], rng: () => number): void {
    // Create a simple connected graph
    for (let i = 0; i < rooms.length - 1; i++) {
      const current = rooms[i];
      const next = rooms[i + 1];

      current.connections.push({
        targetRoomId: next.id,
        type: 'corridor',
        description: 'A corridor leads to the next room',
      });

      // Sometimes add reverse connection
      if (rng() < 0.3) {
        next.connections.push({
          targetRoomId: current.id,
          type: 'corridor',
          description: 'A corridor leads back',
        });
      }
    }
  }

  /**
   * Generate connections between levels
   */
  private generateLevelConnections(z: number) {
    const connections = [];

    // Connect to level above (if not surface)
    if (z !== -1 && z !== 1) {
      connections.push({
        fromZ: z,
        toZ: z + (z < 0 ? 1 : -1), // Move toward 0
        type: 'staircase' as const,
        description: 'Stairs leading up',
      });
    }

    // Connect to level below (if not at max depth)
    if (Math.abs(z) < 100) {
      connections.push({
        fromZ: z,
        toZ: z + (z < 0 ? -1 : 1), // Move away from 0
        type: 'staircase' as const,
        description: 'Stairs leading down',
      });
    }

    return connections;
  }

  /**
   * Generate encounters for a room
   */
  private generateEncounters(type: RoomType, rng: () => number) {
    const encounters = [];

    if (type === 'boss_room' && rng() < 0.8) {
      encounters.push({
        id: `encounter-boss-${Date.now()}`,
        type: 'boss' as const,
        name: 'Dungeon Boss',
        description: 'A powerful boss guards this room',
        worldContentId: undefined,
        metadata: {},
      });
    } else if (type === 'trap_room' && rng() < 0.6) {
      encounters.push({
        id: `encounter-trap-${Date.now()}`,
        type: 'trap' as const,
        name: 'Deadly Trap',
        description: 'A hidden trap awaits the unwary',
        worldContentId: undefined,
        metadata: {},
      });
    } else if (rng() < 0.3) {
      encounters.push({
        id: `encounter-monster-${Date.now()}`,
        type: 'monster' as const,
        name: 'Dungeon Monster',
        description: 'A creature lurks in the shadows',
        worldContentId: undefined,
        metadata: {},
      });
    }

    return encounters.length > 0 ? encounters : undefined;
  }

  /**
   * Generate loot for a room
   */
  private generateLoot(type: RoomType, rng: () => number) {
    const loot = [];

    if (type === 'treasure_room' && rng() < 0.9) {
      loot.push({
        id: `loot-${Date.now()}`,
        itemId: `item-${Date.now()}`,
        name: 'Treasure',
        rarity: 'rare',
        worldContentId: undefined,
        metadata: {},
      });
    } else if (rng() < 0.1) {
      loot.push({
        id: `loot-${Date.now()}`,
        itemId: `item-${Date.now()}`,
        name: 'Common Item',
        rarity: 'common',
        worldContentId: undefined,
        metadata: {},
      });
    }

    return loot.length > 0 ? loot : undefined;
  }

  /**
   * Generate dungeon name
   */
  private generateDungeonName(type: 'dungeon' | 'tower', seed: string): string {
    const rng = this.createRNG(`${seed}-name`);
    const prefixes = ['Ancient', 'Forgotten', 'Dark', 'Cursed', 'Lost'];
    const suffixes = type === 'dungeon' 
      ? ['Caverns', 'Depths', 'Catacombs', 'Mines', 'Labyrinth']
      : ['Spire', 'Tower', 'Keep', 'Citadel', 'Fortress'];

    return `${prefixes[Math.floor(rng() * prefixes.length)]} ${suffixes[Math.floor(rng() * suffixes.length)]}`;
  }

  /**
   * Generate room name
   */
  private generateRoomName(type: RoomType, index: number): string {
    const typeNames: Record<RoomType, string> = {
      chamber: 'Chamber',
      corridor: 'Corridor',
      boss_room: 'Boss Chamber',
      treasure_room: 'Treasure Room',
      trap_room: 'Trapped Room',
      puzzle_room: 'Puzzle Room',
      entrance: 'Entrance',
      exit: 'Exit',
    };

    return `${typeNames[type]} ${index + 1}`;
  }

  /**
   * Generate room description
   */
  private generateRoomDescription(type: RoomType, z: number): string {
    const depth = Math.abs(z);
    return `A ${type.replace('_', ' ')} at depth ${depth}`;
  }

  /**
   * Create a simple RNG from a seed string
   */
  private createRNG(seed: string): () => number {
    let hash = this.hashString(seed);
    return () => {
      hash = ((hash * 9301) + 49297) % 233280;
      return hash / 233280;
    };
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

