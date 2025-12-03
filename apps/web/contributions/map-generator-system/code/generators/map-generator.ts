/**
 * Map Generator
 * 
 * Main map generator that coordinates surface and dungeon generation.
 * Integrates with world-generation-system and world-content-hierarchy.
 */

import type {
  MapCell,
  MapRegion,
  InitialMapOptions,
  ExploreCellOptions,
  MapQuery,
  MapQueryResult,
  CellGenerationContext,
  DungeonGenerationOptions,
  Dungeon,
} from '../types/map-generation';
import { SurfaceGenerator } from './surface-generator';
import { DungeonGenerator } from './dungeon-generator';
import { MapStorage } from '../storage/map-storage';

export class MapGenerator {
  private surfaceGenerator: SurfaceGenerator;
  private dungeonGenerator: DungeonGenerator;
  private storage: MapStorage;

  constructor() {
    this.surfaceGenerator = new SurfaceGenerator();
    this.dungeonGenerator = new DungeonGenerator();
    this.storage = new MapStorage();
  }

  /**
   * Generate initial map region with pre-generated features
   */
  async generateInitialMap(
    options: InitialMapOptions,
    worldGenerator?: unknown,
    worldManager?: unknown
  ): Promise<MapCell[]> {
    const { seed, region, density = 'normal', includeDungeons = true } = options;
    const cells: MapCell[] = [];

    // Generate cells for the region
    for (let x = region.xMin; x <= region.xMax; x++) {
      for (let y = region.yMin; y <= region.yMax; y++) {
        const cellSeed = this.getCellSeed(seed, x, y);
        
        const context: CellGenerationContext = {
          seed: cellSeed,
          x,
          y,
          worldGenerator,
          worldManager,
        };

        const cell = await this.surfaceGenerator.generateCell(context, density);
        
        // Optionally generate dungeon entrance
        if (includeDungeons && this.shouldHaveDungeon(cellSeed, x, y)) {
          const dungeonEntrance = await this.generateDungeonEntrance(
            x,
            y,
            cellSeed,
            worldManager
          );
          cell.dungeonEntrances.push(dungeonEntrance);
        }

        // Store cell
        await this.storage.saveCell(cell);
        cells.push(cell);
      }
    }

    return cells;
  }

  /**
   * Get or generate a cell at specific coordinates
   */
  async getCell(x: number, y: number): Promise<MapCell | null> {
    // Try to load from storage first
    const existing = await this.storage.getCell(x, y);
    if (existing) {
      return existing;
    }

    return null;
  }

  /**
   * Explore a new cell (on-the-fly generation)
   */
  async exploreCell(
    x: number,
    y: number,
    options: ExploreCellOptions = {}
  ): Promise<MapCell> {
    // Check if cell already exists
    const existing = await this.getCell(x, y);
    if (existing) {
      return existing;
    }

    // Generate new cell
    const seed = options.seed || this.getCellSeed('world', x, y);
    const context: CellGenerationContext = {
      seed,
      x,
      y,
      worldGenerator: options.worldGenerator,
      worldManager: options.worldManager,
    };

    const cell = await this.surfaceGenerator.generateCell(context, 'normal');

    // Optionally generate dungeon entrance
    if (options.generateDungeon !== false && this.shouldHaveDungeon(seed, x, y)) {
      const dungeonEntrance = await this.generateDungeonEntrance(
        x,
        y,
        seed,
        options.worldManager
      );
      cell.dungeonEntrances.push(dungeonEntrance);
    }

    // Store permanently
    await this.storage.saveCell(cell);

    return cell;
  }

  /**
   * Get dungeon at a specific location
   */
  async getDungeon(
    entranceX: number,
    entranceY: number,
    z: number
  ): Promise<Dungeon | null> {
    // Find dungeon entrance
    const cell = await this.getCell(entranceX, entranceY);
    if (!cell) {
      return null;
    }

    const entrance = cell.dungeonEntrances.find(
      e => e.surfaceX === entranceX && e.surfaceY === entranceY
    );

    if (!entrance) {
      return null;
    }

    // Load dungeon from storage
    const dungeon = await this.storage.getDungeon(entrance.dungeonId);
    if (!dungeon) {
      return null;
    }

    return dungeon;
  }

  /**
   * Generate a dungeon at a location
   */
  async generateDungeon(
    options: DungeonGenerationOptions
  ): Promise<Dungeon> {
    const dungeon = await this.dungeonGenerator.generate(options);
    
    // Store dungeon
    await this.storage.saveDungeon(dungeon);

    return dungeon;
  }

  /**
   * Query map cells
   */
  async queryMap(query: MapQuery): Promise<MapQueryResult> {
    return await this.storage.queryCells(query);
  }

  /**
   * Get deterministic seed for a cell based on world seed and coordinates
   */
  private getCellSeed(worldSeed: string, x: number, y: number): string {
    return `${worldSeed}-${x}-${y}`;
  }

  /**
   * Determine if a cell should have a dungeon entrance
   */
  private shouldHaveDungeon(seed: string, x: number, y: number): boolean {
    // Use seeded RNG to deterministically decide
    // This is a simple hash-based approach
    const hash = this.hashString(`${seed}-dungeon-check`);
    const normalized = (hash % 1000) / 1000;
    
    // ~10% chance of dungeon entrance
    return normalized < 0.1;
  }

  /**
   * Generate a dungeon entrance at a location
   */
  private async generateDungeonEntrance(
    x: number,
    y: number,
    seed: string,
    worldManager?: unknown
  ) {
    const dungeonSeed = `${seed}-dungeon`;
    const dungeonId = `dungeon-${x}-${y}-${Date.now()}`;

    // Generate dungeon structure
    const dungeon = await this.generateDungeon({
      seed: dungeonSeed,
      entranceX: x,
      entranceY: y,
      type: 'dungeon',
      depth: 100,
      worldManager,
    });

    // Create entrance
    const entrance = {
      id: `entrance-${x}-${y}`,
      name: `Dungeon Entrance at (${x}, ${y})`,
      description: `An entrance to ${dungeon.name}`,
      surfaceX: x,
      surfaceY: y,
      dungeonId: dungeon.id,
      worldContentId: dungeon.worldContentId,
      metadata: {},
    };

    return entrance;
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

