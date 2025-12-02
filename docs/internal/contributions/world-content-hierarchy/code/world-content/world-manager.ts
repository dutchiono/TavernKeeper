import type {
  WorldContent,
  WorldContentEntry,
  Provenance,
  Lore,
  ContentConnection,
  DungeonContentData,
  ItemContentData,
  BossContentData,
  Civilization,
} from '../types/world-content';
import { ProvenanceTracker } from './provenance-tracker';
import { LoreGenerator } from './lore-generator';
import { ContentHierarchy } from './content-hierarchy';

/**
 * World Manager
 * 
 * Main manager for world content hierarchy system.
 * Coordinates provenance tracking, lore generation, and hierarchy management.
 */
export class WorldManager {
  private provenanceTracker: ProvenanceTracker;
  private loreGenerator: LoreGenerator;
  private hierarchy: ContentHierarchy;

  constructor() {
    this.provenanceTracker = new ProvenanceTracker();
    this.loreGenerator = new LoreGenerator();
    this.hierarchy = new ContentHierarchy();
  }

  /**
   * Create world content for a dungeon
   */
  async createDungeonContent(
    data: DungeonContentData,
    getLocation: (locationName?: string) => Promise<{ id: string; name: string } | null>,
    getCivilization: (seed: string) => Promise<Civilization | null>
  ): Promise<WorldContentEntry> {
    // Get or create location
    const location = await getLocation(data.location);
    const locationId = location?.id || null;

    // Get civilization from seed (deterministic)
    const civilization = await getCivilization(data.dungeonSeed);
    const creatorId = civilization?.id || null;

    // Create dungeon content
    const content = this.hierarchy.createContent(
      'dungeon',
      data.name,
      `An ancient dungeon located ${data.location ? `in ${data.location}` : 'somewhere in the world'}.`,
      locationId,
      {
        seed: data.dungeonSeed,
        rooms: data.rooms,
        depth: data.depth,
      }
    );

    // Create provenance
    const creationTime = this.calculateCreationTime(data.dungeonSeed, 500); // ~500 years ago
    const provenance = this.provenanceTracker.createProvenance(
      content.id,
      'dungeon',
      'built',
      locationId,
      creatorId,
      creationTime
    );

    // Add discovery/conquest events if applicable
    if (data.clearedBy && data.clearedAt) {
      this.provenanceTracker.addDiscovery(provenance, data.clearedBy, data.clearedAt);
      this.provenanceTracker.addConquest(provenance, data.clearedBy, data.clearedAt);
    }

    // Build connections
    const connections: ContentConnection[] = [];
    if (locationId) {
      connections.push({
        targetId: locationId,
        relationship: 'located_in',
        strength: 'strong',
        description: `Dungeon is located in ${location?.name}`,
      });
    }
    if (creatorId) {
      connections.push({
        targetId: creatorId,
        relationship: 'built_by',
        strength: 'strong',
        description: `Dungeon was built by ${civilization?.name}`,
      });
    }

    // Generate lore
    const lore = this.loreGenerator.generateLore(content, provenance, connections);

    return {
      content,
      provenance,
      lore,
    };
  }

  /**
   * Create world content for an item
   */
  async createItemContent(
    data: ItemContentData,
    getDungeon: (dungeonId: string) => Promise<{ id: string; name: string; creatorId: string | null } | null>,
    getCivilization: (seed: string) => Promise<Civilization | null>
  ): Promise<WorldContentEntry> {
    // Get dungeon where item was found
    const dungeon = data.foundIn ? await getDungeon(data.foundIn) : null;

    // Get civilization (from dungeon or item seed)
    const seed = dungeon?.creatorId ? `civilization-${dungeon.creatorId}` : data.itemSeed;
    const civilization = await getCivilization(seed);
    const creatorId = civilization?.id || null;

    // Create item content
    const content = this.hierarchy.createContent(
      'item',
      data.name,
      `A ${data.rarity} ${data.type}${data.material ? ` made of ${data.material}` : ''}.`,
      data.foundIn || null,
      {
        seed: data.itemSeed,
        type: data.type,
        rarity: data.rarity,
        material: data.material,
      }
    );

    // Create provenance
    const creationTime = this.calculateCreationTime(data.itemSeed, 450); // ~450 years ago
    const provenance = this.provenanceTracker.createProvenance(
      content.id,
      'item',
      data.material ? 'forged' : 'crafted',
      data.foundIn || null,
      creatorId,
      creationTime
    );

    // Add materials if specified
    if (data.material) {
      provenance.materials = [data.material];
    }

    // Add transfer events for previous owners
    if (data.previousOwners && data.previousOwners.length > 0) {
      let previousOwner: string | null = null;
      for (const owner of data.previousOwners) {
        const transferTime = new Date(creationTime.getTime() + Math.random() * 10000000000);
        this.provenanceTracker.addTransfer(provenance, previousOwner, [owner], transferTime);
        previousOwner = owner;
      }
    }

    // Add discovery event
    if (data.foundBy && data.foundAt) {
      this.provenanceTracker.addDiscovery(provenance, data.foundBy, data.foundAt);
      this.provenanceTracker.addTransfer(
        provenance,
        data.previousOwners?.[data.previousOwners.length - 1] || null,
        data.foundBy,
        data.foundAt,
        'discovered in dungeon'
      );
    }

    // Build connections
    const connections: ContentConnection[] = [];
    if (data.foundIn && dungeon) {
      connections.push({
        targetId: data.foundIn,
        relationship: 'discovered_in',
        strength: 'strong',
        description: `Item was discovered in ${dungeon.name}`,
      });
    }
    if (creatorId) {
      connections.push({
        targetId: creatorId,
        relationship: 'created_by',
        strength: 'strong',
        description: `Item was created by ${civilization?.name}`,
      });
    }

    // Generate lore
    const lore = this.loreGenerator.generateLore(content, provenance, connections);

    return {
      content,
      provenance,
      lore,
    };
  }

  /**
   * Create world content for a boss
   */
  async createBossContent(
    data: BossContentData,
    getDungeon: (dungeonId: string) => Promise<{ id: string; name: string; creatorId: string | null } | null>
  ): Promise<WorldContentEntry> {
    // Get dungeon where boss was encountered
    const dungeon = data.location ? await getDungeon(data.location) : null;

    // Create boss content
    const content = this.hierarchy.createContent(
      'boss',
      data.name,
      `A powerful ${data.type} that ${dungeon ? `dwells in ${dungeon.name}` : 'roams the world'}.`,
      data.location || null,
      {
        seed: data.bossSeed,
        type: data.type,
      }
    );

    // Create provenance
    const creationTime = this.calculateCreationTime(data.bossSeed, 100); // ~100 years ago
    const provenance = this.provenanceTracker.createProvenance(
      content.id,
      'boss',
      'born',
      data.location || null,
      null, // Bosses may not have a specific creator
      creationTime
    );

    // Add defeat event if applicable
    if (data.defeatedBy && data.defeatedAt) {
      this.provenanceTracker.addConquest(provenance, data.defeatedBy, data.defeatedAt);
    }

    // Build connections
    const connections: ContentConnection[] = [];
    if (data.location && dungeon) {
      connections.push({
        targetId: data.location,
        relationship: 'dwells_in',
        strength: 'strong',
        description: `Boss dwells in ${dungeon.name}`,
      });
    }
    if (data.relatedLocations) {
      for (const relatedId of data.relatedLocations) {
        connections.push({
          targetId: relatedId,
          relationship: 'related_to',
          strength: 'moderate',
          description: `Boss is related to this location`,
        });
      }
    }

    // Generate lore
    const lore = this.loreGenerator.generateLore(content, provenance, connections);

    return {
      content,
      provenance,
      lore,
    };
  }

  /**
   * Get lore for a content element
   */
  async getLore(
    contentId: string,
    getEntry: (id: string) => Promise<WorldContentEntry | null>
  ): Promise<Lore | null> {
    const entry = await getEntry(contentId);
    return entry?.lore || null;
  }

  /**
   * Get provenance chain
   */
  async getProvenanceChain(
    contentId: string,
    getParent: (id: string) => Promise<{ id: string; name: string; type: string; parentId: string | null } | null>
  ): Promise<Array<{ id: string; name: string; type: string; relationship: string }>> {
    return this.provenanceTracker.getProvenanceChain(contentId, getParent);
  }

  /**
   * Enrich lore with new events
   */
  async enrichLore(
    contentId: string,
    getEntry: (id: string) => Promise<WorldContentEntry | null>,
    newEvents: Array<{
      timestamp: Date;
      type: 'creation' | 'discovery' | 'conquest' | 'destruction' | 'modification' | 'transfer' | 'significant';
      description: string;
      actors: string[];
      relatedContentIds: string[];
    }>,
    newConnections: ContentConnection[]
  ): Promise<Lore | null> {
    const entry = await getEntry(contentId);
    if (!entry) return null;

    const enriched = this.loreGenerator.enrichLore(
      entry.lore,
      newEvents.map((e) => ({
        ...e,
        id: `event-${contentId}-${Date.now()}`,
      })),
      newConnections
    );

    return enriched;
  }

  /**
   * Calculate creation time from seed (deterministic)
   */
  private calculateCreationTime(seed: string, baseYearsAgo: number): Date {
    // Use seed to deterministically calculate creation time
    const seedHash = this.simpleHash(seed);
    const variation = (seedHash % 200) - 100; // ±100 years variation
    const yearsAgo = baseYearsAgo + variation;
    const now = new Date();
    return new Date(now.getTime() - yearsAgo * 365 * 24 * 60 * 60 * 1000);
  }

  /**
   * Simple hash function for deterministic values
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

