/**
 * Map Storage
 * 
 * Handles persistence of map data (cells, dungeons, features).
 * In practice, this would interface with a database (Supabase).
 */

import type {
  MapCell,
  Dungeon,
  MapQuery,
  MapQueryResult,
  SurfaceCoordinate,
} from '../types/map-generation';

export class MapStorage {
  // In-memory storage for demonstration
  // In practice, this would use database operations
  private cells: Map<string, MapCell> = new Map();
  private dungeons: Map<string, Dungeon> = new Map();

  /**
   * Save a cell to storage
   */
  async saveCell(cell: MapCell): Promise<void> {
    const key = this.getCellKey(cell.x, cell.y);
    this.cells.set(key, cell);

    // In practice, would save to database:
    // await supabase.from('map_cells').upsert(cell);
  }

  /**
   * Get a cell from storage
   */
  async getCell(x: number, y: number): Promise<MapCell | null> {
    const key = this.getCellKey(x, y);
    const cell = this.cells.get(key);
    
    if (cell) {
      return cell;
    }

    // In practice, would query database:
    // const { data } = await supabase
    //   .from('map_cells')
    //   .select('*')
    //   .eq('x', x)
    //   .eq('y', y)
    //   .single();
    // return data || null;

    return null;
  }

  /**
   * Save a dungeon to storage
   */
  async saveDungeon(dungeon: Dungeon): Promise<void> {
    this.dungeons.set(dungeon.id, dungeon);

    // In practice, would save to database:
    // await supabase.from('dungeons').upsert(dungeon);
  }

  /**
   * Get a dungeon from storage
   */
  async getDungeon(dungeonId: string): Promise<Dungeon | null> {
    const dungeon = this.dungeons.get(dungeonId);
    
    if (dungeon) {
      return dungeon;
    }

    // In practice, would query database:
    // const { data } = await supabase
    //   .from('dungeons')
    //   .select('*')
    //   .eq('id', dungeonId)
    //   .single();
    // return data || null;

    return null;
  }

  /**
   * Query cells based on criteria
   */
  async queryCells(query: MapQuery): Promise<MapQueryResult> {
    let results: MapCell[] = [];

    // Get all cells (in practice, would query database)
    for (const cell of this.cells.values()) {
      results.push(cell);
    }

    // Filter by region
    if (query.region) {
      results = results.filter(
        cell =>
          cell.x >= query.region!.xMin &&
          cell.x <= query.region!.xMax &&
          cell.y >= query.region!.yMin &&
          cell.y <= query.region!.yMax
      );
    }

    // Filter by feature types
    if (query.featureTypes && query.featureTypes.length > 0) {
      results = results.filter(cell =>
        cell.features.some(f => query.featureTypes!.includes(f.type))
      );
    }

    // Filter by dungeon presence
    if (query.hasDungeon !== undefined) {
      results = results.filter(
        cell =>
          (query.hasDungeon && cell.dungeonEntrances.length > 0) ||
          (!query.hasDungeon && cell.dungeonEntrances.length === 0)
      );
    }

    // Filter by discoverer
    if (query.discoveredBy && query.discoveredBy.length > 0) {
      results = results.filter(cell =>
        cell.discoveredBy?.some(id => query.discoveredBy!.includes(id))
      );
    }

    // Filter by world content ID
    if (query.worldContentId) {
      results = results.filter(
        cell =>
          cell.worldContentId === query.worldContentId ||
          cell.features.some(f => f.worldContentId === query.worldContentId) ||
          cell.dungeonEntrances.some(e => e.worldContentId === query.worldContentId)
      );
    }

    // Sort by coordinates (x, then y)
    results.sort((a, b) => {
      if (a.x !== b.x) return a.x - b.x;
      return a.y - b.y;
    });

    // Apply pagination
    const total = results.length;
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    const paginated = results.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      cells: paginated,
      total,
      hasMore,
    };
  }

  /**
   * Get cells in a region
   */
  async getCellsInRegion(
    xMin: number,
    xMax: number,
    yMin: number,
    yMax: number
  ): Promise<MapCell[]> {
    const query: MapQuery = {
      region: { xMin, xMax, yMin, yMax },
    };

    const result = await this.queryCells(query);
    return result.cells;
  }

  /**
   * Check if a cell exists
   */
  async cellExists(x: number, y: number): Promise<boolean> {
    const cell = await this.getCell(x, y);
    return cell !== null;
  }

  /**
   * Get cell key for storage
   */
  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  /**
   * Clear all stored data (for testing)
   */
  async clear(): Promise<void> {
    this.cells.clear();
    this.dungeons.clear();
  }
}

