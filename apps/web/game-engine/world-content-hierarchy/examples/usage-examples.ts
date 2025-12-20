/**
 * Usage Examples for World Content Hierarchy System
 * 
 * These examples show how to integrate the world content system into the game
 * and how to use it for generating lore and tracking provenance.
 */

import { WorldManager } from '../code/world-content/world-manager';
import { WorldContentService } from '../code/services/worldContentService';

// ============================================================================
// Example 1: Create world content when dungeon is cleared
// ============================================================================

export async function exampleCreateDungeonContent() {
  const service = new WorldContentService();

  // When a dungeon is cleared
  const dungeonContent = await service.createDungeonContent({
    dungeonId: 'dungeon-123',
    dungeonSeed: 'seed-abc123',
    name: 'Ancient Dwarven Mine',
    location: 'Northern Mountain Range',
    clearedBy: ['agent-1', 'agent-2'],
    clearedAt: new Date(),
    discoveredItems: ['item-1', 'item-2'],
    defeatedBosses: ['boss-1'],
    rooms: 10,
    depth: 5,
  });

  // Save to database
  await service.saveContent(dungeonContent);

  // Query the lore
  const lore = await service.getLore('dungeon-123');
  console.log('Dungeon Lore:', lore?.story);
  console.log('Significance:', lore?.significance);

  // Get provenance chain
  const chain = await service.getProvenanceChain('dungeon-123');
  console.log('Provenance Chain:', chain.chain);
}

// ============================================================================
// Example 2: Create world content when unique item is found
// ============================================================================

export async function exampleCreateItemContent() {
  const service = new WorldContentService();

  // When a unique item is found
  const itemContent = await service.createItemContent({
    itemId: 'item-1',
    itemSeed: 'item-seed-xyz789',
    name: 'Dwarven Warhammer of the Forge',
    type: 'weapon',
    rarity: 'legendary',
    foundIn: 'dungeon-123',
    foundBy: ['agent-1'],
    foundAt: new Date(),
    material: 'Mithril and Iron',
    previousOwners: ['Thorgrim', 'Dwarven Warrior'],
  });

  // Save to database
  await service.saveContent(itemContent);

  // Get lore
  const lore = await service.getLore('item-1');
  console.log('Item Lore:', lore?.story);
  console.log('Materials:', itemContent.provenance.materials);

  // Get related content (the dungeon it was found in)
  const related = await service.getRelatedContent('item-1', ['discovered_in']);
  console.log('Found in:', related[0]?.content.name);
}

// ============================================================================
// Example 3: Create world content when boss is defeated
// ============================================================================

export async function exampleCreateBossContent() {
  const service = new WorldContentService();

  // When a boss is defeated
  const bossContent = await service.createBossContent({
    bossId: 'boss-1',
    bossSeed: 'boss-seed-456',
    name: 'Goblin Chieftain Grubnak',
    type: 'goblin',
    location: 'dungeon-123',
    defeatedBy: ['agent-1', 'agent-2'],
    defeatedAt: new Date(),
    relatedLocations: ['dungeon-123'],
  });

  // Save to database
  await service.saveContent(bossContent);

  // Get lore
  const lore = await service.getLore('boss-1');
  console.log('Boss Lore:', lore?.story);

  // Get provenance chain
  const chain = await service.getProvenanceChain('boss-1');
  console.log('Boss Origin:', chain.chain);
}

// ============================================================================
// Example 4: Integration in runWorker.ts
// ============================================================================

export async function exampleWorkerIntegration() {
  // In apps/web/workers/runWorker.ts, after simulation:

  /*
  const result = await simulateRun(config);
  const service = new WorldContentService();

  // Create world content for the dungeon
  if (result.result === 'victory') {
    const dungeonContent = await service.createDungeonContent({
      dungeonId: dungeonId,
      dungeonSeed: seed,
      name: dungeonName,
      location: 'Northern Wastes', // Could be determined from seed
      clearedBy: party.map(p => p.agentId),
      clearedAt: new Date(),
      discoveredItems: result.discoveredItems,
      defeatedBosses: result.defeatedBosses,
      rooms: result.roomsExplored,
      depth: result.depth,
    });

    await service.saveContent(dungeonContent);
  }

  // Create world content for unique items found
  for (const item of result.uniqueItems) {
    const itemContent = await service.createItemContent({
      itemId: item.id,
      itemSeed: item.seed,
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      foundIn: dungeonId,
      foundBy: party.map(p => p.agentId),
      foundAt: new Date(),
      material: item.material,
    });

    await service.saveContent(itemContent);
  }

  // Create world content for bosses defeated
  for (const boss of result.defeatedBosses) {
    const bossContent = await service.createBossContent({
      bossId: boss.id,
      bossSeed: boss.seed,
      name: boss.name,
      type: boss.type,
      location: dungeonId,
      defeatedBy: party.map(p => p.agentId),
      defeatedAt: new Date(),
    });

    await service.saveContent(bossContent);
  }
  */
}

// ============================================================================
// Example 5: Enrich lore when significant events occur
// ============================================================================

export async function exampleEnrichLore() {
  const service = new WorldContentService();

  // When a significant event happens related to existing world content
  const enrichedLore = await service.enrichContentLore(
    'dungeon-123',
    [
      {
        timestamp: new Date(),
        type: 'significant',
        description: 'A second party cleared the dungeon, discovering hidden chambers',
        actors: ['agent-3', 'agent-4'],
        relatedContentIds: ['room-11', 'room-12'],
      },
    ],
    [
      {
        targetId: 'location-2',
        relationship: 'related_to',
        strength: 'moderate',
        description: 'Dungeon is related to nearby ruins',
      },
    ]
  );

  console.log('Enriched Lore:', enrichedLore?.story);
  console.log('Lore Version:', enrichedLore?.version);
}

// ============================================================================
// Example 6: Query world content
// ============================================================================

export async function exampleQueryWorldContent() {
  const service = new WorldContentService();

  // Query all dungeons in a region
  const dungeons = await service.queryContent({
    type: ['dungeon'],
    location: 'Northern Mountain Range',
    limit: 10,
  });

  console.log(`Found ${dungeons.length} dungeons`);

  // Query items created by a specific civilization
  const items = await service.queryContent({
    type: ['item'],
    // creatorId: 'civilization-dwarven-kingdom', // Would need to join with provenance
    limit: 20,
  });

  console.log(`Found ${items.length} items`);

  // Query content with connections to a specific element
  const related = await service.getRelatedContent('dungeon-123');
  console.log(`Found ${related.length} related elements`);
}

// ============================================================================
// Example 7: API endpoint for world lore
// ============================================================================

export function exampleLoreAPI() {
  // In apps/web/app/api/world/lore/route.ts:

  /*
  import { NextRequest, NextResponse } from 'next/server';
  import { WorldContentService } from '@innkeeper/engine/world-content';
  
  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    
    if (!contentId) {
      return NextResponse.json({ error: 'contentId required' }, { status: 400 });
    }
    
    const service = new WorldContentService();
    const lore = await service.getLore(contentId);
    
    if (!lore) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }
    
    return NextResponse.json(lore);
  }
  */
}

// ============================================================================
// Example 8: API endpoint for provenance chain
// ============================================================================

export function exampleProvenanceAPI() {
  // In apps/web/app/api/world/provenance/route.ts:

  /*
  import { NextRequest, NextResponse } from 'next/server';
  import { WorldContentService } from '@innkeeper/engine/world-content';
  
  export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const contentId = searchParams.get('contentId');
    
    if (!contentId) {
      return NextResponse.json({ error: 'contentId required' }, { status: 400 });
    }
    
    const service = new WorldContentService();
    const chain = await service.getProvenanceChain(contentId);
    
    return NextResponse.json(chain);
  }
  */
}

// ============================================================================
// Example 9: Agent integration - agents can query world lore
// ============================================================================

export async function exampleAgentIntegration() {
  // Agents can query world lore to inform decisions

  /*
  // In agent decision-making:
  const service = new WorldContentService();
  
  // Agent wants to know about a dungeon before entering
  const dungeonLore = await service.getLore('dungeon-123');
  if (dungeonLore) {
    // Agent can use this lore in conversation:
    // "I've heard this dungeon was built by the Ancient Dwarven Kingdom..."
    console.log('Agent knowledge:', dungeonLore.story);
  }
  
  // Agent finds an item and wants to know its history
  const itemLore = await service.getLore('item-1');
  if (itemLore) {
    // Agent can reference the item's history:
    // "This warhammer belonged to a legendary Dwarven warrior..."
    console.log('Item history:', itemLore.story);
  }
  */
}







