/**
 * Map Generator System - Usage Examples
 * 
 * Examples demonstrating how to use the map generator system.
 */

import { MapGenerator } from '../code/generators/map-generator';
// In practice, these would be imported from the actual packages:
// import { WorldGenerator } from '@innkeeper/engine/world-generation';
// import { WorldManager } from '@innkeeper/engine/world-content';

/**
 * Example 1: Generate initial map region
 */
export async function exampleGenerateInitialMap() {
  const mapGenerator = new MapGenerator();
  
  // Generate a 10x10 region around origin
  const cells = await mapGenerator.generateInitialMap({
    seed: 'my-world-seed',
    region: {
      xMin: -5,
      xMax: 5,
      yMin: -5,
      yMax: 5,
    },
    density: 'normal',
    includeDungeons: true,
  });

  console.log(`Generated ${cells.length} cells`);
  console.log('Sample cell:', cells[0]);
}

/**
 * Example 2: Query existing cell
 */
export async function exampleQueryCell() {
  const mapGenerator = new MapGenerator();
  
  // Get cell at specific coordinates
  const cell = await mapGenerator.getCell(10, -5);
  
  if (cell) {
    console.log(`Cell at (10, -5):`);
    console.log(`  Features: ${cell.features.length}`);
    console.log(`  Dungeon entrances: ${cell.dungeonEntrances.length}`);
    console.log(`  Features:`, cell.features.map(f => f.name));
  } else {
    console.log('Cell not found');
  }
}

/**
 * Example 3: Explore new area (on-the-fly generation)
 */
export async function exampleExploreNewArea() {
  const mapGenerator = new MapGenerator();
  
  // Explore a new cell that doesn't exist yet
  const newCell = await mapGenerator.exploreCell(100, 100, {
    generateDungeon: true,
    // worldGenerator: worldGeneratorInstance,
    // worldManager: worldManagerInstance,
  });

  console.log(`Explored new cell at (100, 100):`);
  console.log(`  Features: ${newCell.features.length}`);
  console.log(`  Dungeon entrances: ${newCell.dungeonEntrances.length}`);
  console.log(`  Discovered at: ${newCell.discoveredAt}`);
}

/**
 * Example 4: Get dungeon structure
 */
export async function exampleGetDungeon() {
  const mapGenerator = new MapGenerator();
  
  // First, ensure we have a dungeon entrance
  const cell = await mapGenerator.getCell(10, -5);
  if (!cell || cell.dungeonEntrances.length === 0) {
    console.log('No dungeon at this location');
    return;
  }

  const entrance = cell.dungeonEntrances[0];
  
  // Get the dungeon structure
  const dungeon = await mapGenerator.getDungeon(entrance.surfaceX, entrance.surfaceY, -1);
  
  if (dungeon) {
    console.log(`Dungeon: ${dungeon.name}`);
    console.log(`  Type: ${dungeon.type}`);
    console.log(`  Levels: ${dungeon.levels.length}`);
    console.log(`  Max depth: ${dungeon.maxDepth}`);
    
    // Show first level
    const firstLevel = dungeon.levels[0];
    console.log(`  First level (z=${firstLevel.z}):`);
    console.log(`    Rooms: ${firstLevel.rooms.length}`);
    console.log(`    Connections: ${firstLevel.connections.length}`);
  }
}

/**
 * Example 5: Query map by region
 */
export async function exampleQueryRegion() {
  const mapGenerator = new MapGenerator();
  
  // Query all cells in a region
  const result = await mapGenerator.queryMap({
    region: {
      xMin: 0,
      xMax: 10,
      yMin: 0,
      yMax: 10,
    },
    limit: 50,
  });

  console.log(`Found ${result.total} cells in region`);
  console.log(`Returned ${result.cells.length} cells`);
  console.log(`Has more: ${result.hasMore}`);
}

/**
 * Example 6: Query map by feature type
 */
export async function exampleQueryByFeature() {
  const mapGenerator = new MapGenerator();
  
  // Find all cells with organization features
  const result = await mapGenerator.queryMap({
    featureTypes: ['organization'],
    limit: 20,
  });

  console.log(`Found ${result.total} cells with organizations`);
  result.cells.forEach(cell => {
    const orgs = cell.features.filter(f => f.type === 'organization');
    console.log(`  Cell (${cell.x}, ${cell.y}): ${orgs.map(o => o.name).join(', ')}`);
  });
}

/**
 * Example 7: Query cells with dungeons
 */
export async function exampleQueryDungeons() {
  const mapGenerator = new MapGenerator();
  
  // Find all cells with dungeon entrances
  const result = await mapGenerator.queryMap({
    hasDungeon: true,
    limit: 10,
  });

  console.log(`Found ${result.total} cells with dungeons`);
  result.cells.forEach(cell => {
    console.log(`  Cell (${cell.x}, ${cell.y}): ${cell.dungeonEntrances.length} entrance(s)`);
    cell.dungeonEntrances.forEach(entrance => {
      console.log(`    - ${entrance.name}`);
    });
  });
}

/**
 * Example 8: Generate dungeon directly
 */
export async function exampleGenerateDungeon() {
  const mapGenerator = new MapGenerator();
  
  // Generate a dungeon at a specific location
  const dungeon = await mapGenerator.generateDungeon({
    seed: 'dungeon-seed-123',
    entranceX: 50,
    entranceY: 50,
    type: 'dungeon',
    depth: 100,
    // worldManager: worldManagerInstance,
  });

  console.log(`Generated dungeon: ${dungeon.name}`);
  console.log(`  Entrance: (${dungeon.entranceX}, ${dungeon.entranceY})`);
  console.log(`  Levels: ${dungeon.levels.length}`);
  console.log(`  Type: ${dungeon.type}`);
}

/**
 * Example 9: Full workflow - Generate world and explore
 */
export async function exampleFullWorkflow() {
  const mapGenerator = new MapGenerator();
  
  // Step 1: Generate initial map region
  console.log('Step 1: Generating initial map...');
  await mapGenerator.generateInitialMap({
    seed: 'world-seed',
    region: {
      xMin: -10,
      xMax: 10,
      yMin: -10,
      yMax: 10,
    },
    density: 'normal',
    includeDungeons: true,
  });

  // Step 2: Query a specific cell
  console.log('\nStep 2: Querying cell at (5, 5)...');
  const cell = await mapGenerator.getCell(5, 5);
  if (cell) {
    console.log(`  Found cell with ${cell.features.length} features`);
  }

  // Step 3: Explore a new area
  console.log('\nStep 3: Exploring new area at (100, 100)...');
  const newCell = await mapGenerator.exploreCell(100, 100, {
    generateDungeon: true,
  });
  console.log(`  Generated cell with ${newCell.features.length} features`);

  // Step 4: If dungeon exists, explore it
  if (newCell.dungeonEntrances.length > 0) {
    console.log('\nStep 4: Exploring dungeon...');
    const entrance = newCell.dungeonEntrances[0];
    const dungeon = await mapGenerator.getDungeon(
      entrance.surfaceX,
      entrance.surfaceY,
      -1
    );
    
    if (dungeon) {
      console.log(`  Dungeon: ${dungeon.name}`);
      console.log(`  First level has ${dungeon.levels[0].rooms.length} rooms`);
    }
  }

  // Step 5: Query for all dungeons
  console.log('\nStep 5: Querying all dungeons...');
  const dungeonResult = await mapGenerator.queryMap({
    hasDungeon: true,
    limit: 10,
  });
  console.log(`  Found ${dungeonResult.total} cells with dungeons`);
}

/**
 * Example 10: Integration with world generation system
 */
export async function exampleWithWorldGeneration() {
  // This example shows how the map generator would integrate
  // with world-generation-system and world-content-hierarchy
  
  // In practice:
  // const worldGenerator = new WorldGenerator();
  // const worldManager = new WorldManager();
  // const mapGenerator = new MapGenerator();
  
  // // Generate world context
  // const world = await worldGenerator.generateWorld({
  //   seed: 'world-seed',
  //   includeLevels: [2.5, 6], // Geography and Organizations
  // });
  
  // // Generate map using world context
  // const cells = await mapGenerator.generateInitialMap({
  //   seed: 'world-seed',
  //   region: { xMin: -50, xMax: 50, yMin: -50, yMax: 50 },
  //   worldGenerator,
  //   worldManager,
  // });
  
  // // Features will be linked to world content hierarchy
  // // Provenance and lore will be tracked
  console.log('Integration example - see comments in code');
}

