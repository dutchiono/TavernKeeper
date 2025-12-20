/**
 * Usage Examples for World Generation System
 * 
 * These examples show how to generate a complete world and query
 * the generated content.
 */

import { WorldGenerator } from '../code/generators/world-generator';

// ============================================================================
// Example 1: Generate a complete world
// ============================================================================

export async function exampleGenerateCompleteWorld() {
  const generator = new WorldGenerator();

  // Generate complete world with all levels
  const world = await generator.generateWorld({
    seed: 'my-world-seed-12345',
    includeLevels: [1, 2, 2.5, 3, 4, 5, 6, 6.5, 7],
    depth: 'full',
  });

  console.log('Generated World:');
  console.log(`- ${world.primordials.length} Primordial Beings`);
  console.log(`- ${world.cosmicCreators.length} Cosmic Creators`);
  console.log(`- ${world.geography.length} Geography Features`);
  console.log(`- ${world.conceptualBeings.length} Conceptual Beings`);
  console.log(`- ${world.demiGods.length} Demi-Gods`);
  console.log(`- ${world.mortalRaces.length} Mortal Races`);
  console.log(`- ${world.organizations.length} Organizations`);
  console.log(`- ${world.standoutMortals.length} Standout Mortals`);
  console.log(`- ${world.familyMembers.length} Family Members`);

  // Access specific levels
  const primordials = world.primordials;
  primordials.forEach((p) => {
    console.log(`Primordial: ${p.name} (${p.primordialType})`);
  });
}

// ============================================================================
// Example 2: Generate world incrementally
// ============================================================================

export async function exampleIncrementalGeneration() {
  const generator = new WorldGenerator();

  // First, generate just the cosmic foundation
  const foundation = await generator.generateWorld({
    seed: 'incremental-world',
    includeLevels: [1, 2, 2.5],
    depth: 'full',
  });

  console.log('Foundation generated:');
  console.log(`- ${foundation.primordials.length} Primordials`);
  console.log(`- ${foundation.cosmicCreators.length} Cosmic Creators`);
  console.log(`- ${foundation.geography.length} Geography Features`);

  // Later, add mortal elements
  const withMortals = await generator.generateWorld({
    seed: 'incremental-world', // Same seed!
    includeLevels: [1, 2, 2.5, 3, 4, 5],
    depth: 'full',
  });

  console.log('Added mortals:');
  console.log(`- ${withMortals.mortalRaces.length} Races`);
  console.log(`- ${withMortals.organizations.length} Organizations`);
}

// ============================================================================
// Example 3: Query specific world elements
// ============================================================================

export async function exampleQueryWorld() {
  const generator = new WorldGenerator();

  // Get primordials
  const primordials = await generator.getPrimordialBeings('my-seed');
  console.log('Primordials:', primordials.map((p) => p.name));

  // Get geography by type
  const continents = await generator.getGeography('my-seed', 'continent');
  console.log('Continents:', continents.map((g) => g.name));

  const mountains = await generator.getGeography('my-seed', 'mountain_range');
  console.log('Mountain Ranges:', mountains.map((g) => g.name));

  // Get organizations by magnitude
  const kingdoms = await generator.getOrganizations('my-seed', 'kingdom');
  console.log('Kingdoms:', kingdoms.map((o) => o.name));
}

// ============================================================================
// Example 4: Custom world generation
// ============================================================================

export async function exampleCustomWorld() {
  const generator = new WorldGenerator();

  // Generate world with custom primordials and races
  const customWorld = await generator.generateWorld({
    seed: 'custom-world',
    includeLevels: [1, 2, 2.5, 5],
    depth: 'full',
    customPrimordials: ['space', 'time', 'light', 'dark', 'void'],
    customRaces: ['human', 'elf', 'dwarf', 'dragon'],
    geographyDensity: 'dense',
    organizationDensity: 'normal',
  });

  console.log('Custom World:');
  console.log(`- Custom Primordials: ${customWorld.primordials.length}`);
  console.log(`- Custom Races: ${customWorld.mortalRaces.length}`);
  console.log(`- Dense Geography: ${customWorld.geography.length}`);
}

// ============================================================================
// Example 5: Integration with World Content Hierarchy
// ============================================================================

export async function exampleIntegrationWithWorldContent() {
  // In apps/web/workers/worldGeneratorWorker.ts:

  /*
  import { WorldGenerator } from '@innkeeper/engine/world-generation';
  import { WorldContentService } from '@innkeeper/engine/world-content';
  
  export async function generateWorldWorker(seed: string) {
    const worldGenerator = new WorldGenerator();
    const worldContentService = new WorldContentService();
  
    // Generate world
    const world = await worldGenerator.generateWorld({
      seed,
      includeLevels: [1, 2, 2.5, 3, 4, 5, 6, 6.5, 7],
      depth: 'full',
    });
  
    // Convert to world content entries and save
    for (const primordial of world.primordials) {
      const entry = await worldContentService.createPrimordialContent(primordial);
      await worldContentService.saveContent(entry);
    }
  
    for (const cosmic of world.cosmicCreators) {
      const entry = await worldContentService.createCosmicContent(cosmic);
      await worldContentService.saveContent(entry);
    }
  
    // ... continue for all levels
  
    return world;
  }
  */
}

// ============================================================================
// Example 6: API endpoint for world generation
// ============================================================================

export function exampleWorldGenerationAPI() {
  // In apps/web/app/api/world/generate/route.ts:

  /*
  import { NextRequest, NextResponse } from 'next/server';
  import { WorldGenerator } from '@innkeeper/engine/world-generation';
  
  export async function POST(request: NextRequest) {
    const body = await request.json();
    const { seed, includeLevels, depth } = body;
  
    const generator = new WorldGenerator();
    const world = await generator.generateWorld({
      seed: seed || `world-${Date.now()}`,
      includeLevels: includeLevels || [1, 2, 2.5, 3, 4, 5, 6, 6.5, 7],
      depth: depth || 'full',
    });
  
    return NextResponse.json(world);
  }
  */
}

// ============================================================================
// Example 7: Query world structure
// ============================================================================

export async function exampleQueryWorldStructure() {
  const generator = new WorldGenerator();
  const world = await generator.generateWorld({
    seed: 'query-example',
    includeLevels: [1, 2, 2.5, 5, 6],
    depth: 'full',
  });

  // Find a specific organization and trace its lineage
  const kingdom = world.organizations.find((o) => o.magnitude === 'kingdom');
  if (kingdom) {
    console.log(`Kingdom: ${kingdom.name}`);
    console.log(`- Race: ${kingdom.race}`);
    console.log(`- Location: ${kingdom.location}`);
    console.log(`- Leader: ${kingdom.leader || 'None'}`);

    // Find the race
    const race = world.mortalRaces.find((r) => r.id === kingdom.race);
    if (race) {
      console.log(`- Race Details: ${race.name} (${race.raceType})`);
      console.log(`  Created by: ${race.createdBy}`);
      console.log(`  Homeland: ${race.homeland}`);
    }

    // Find the location
    const location = world.geography.find((g) => g.id === kingdom.location);
    if (location) {
      console.log(`- Location: ${location.name} (${location.geographyType})`);
    }
  }
}







