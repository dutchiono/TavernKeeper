/**
 * World Content Integration Layer
 * 
 * Bridges the entity registry with the world-content-hierarchy system.
 * Automatically creates WorldContent entries for all registered entities,
 * generates Provenance chains, and Lore entries.
 */

import type { EntityData, EntityRegistry } from '../core/entity-registry';

/**
 * Simplified WorldContent structure for browser context
 * (Full types available in @world-content-hierarchy)
 */
export interface WorldContentEntry {
  id: string;
  type: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: Date;
  discoveredAt: Date;
  metadata: Record<string, unknown>;
}

export interface ProvenanceEntry {
  contentId: string;
  originId: string | null;
  creatorId: string | null;
  creationMethod: string;
  creationTime: Date | null;
  history: Array<{
    id: string;
    timestamp: Date;
    type: string;
    description: string;
    actors: string[];
    relatedContentIds: string[];
  }>;
  age: number | null;
  materials?: string[];
  location?: string;
}

export interface LoreEntry {
  contentId: string;
  story: string;
  significance: string;
  connections: Array<{
    targetId: string;
    relationship: string;
    strength: 'weak' | 'moderate' | 'strong';
    description: string;
  }>;
  culturalContext?: string;
  enrichedAt: Date;
  version: number;
}

export class WorldContentIntegration {
  private worldContent: Map<string, WorldContentEntry>;
  private provenance: Map<string, ProvenanceEntry>;
  private lore: Map<string, LoreEntry>;
  private entityRegistry: EntityRegistry;

  constructor(entityRegistry: EntityRegistry) {
    this.worldContent = new Map();
    this.provenance = new Map();
    this.lore = new Map();
    this.entityRegistry = entityRegistry;
  }

  /**
   * Create WorldContent entry for an entity
   */
  createWorldContentForEntity(entity: EntityData): WorldContentEntry {
    const worldContentId = entity.worldContentId || `worldcontent-${entity.entityId}`;
    
    const entry: WorldContentEntry = {
      id: worldContentId,
      type: this.mapEntityTypeToWorldContentType(entity.type),
      name: entity.name,
      description: this.generateDescription(entity),
      parentId: entity.creatorId || entity.originId || null,
      createdAt: this.yearToDate(entity.createdAt),
      discoveredAt: new Date(), // Discovered at generation time
      metadata: {
        entityId: entity.entityId,
        ...entity.metadata,
      },
    };

    this.worldContent.set(worldContentId, entry);
    return entry;
  }

  /**
   * Create Provenance entry for an entity
   */
  createProvenanceForEntity(entity: EntityData): ProvenanceEntry {
    const worldContentId = entity.worldContentId || `worldcontent-${entity.entityId}`;
    
    const provenanceEntry: ProvenanceEntry = {
      contentId: worldContentId,
      originId: entity.originId || null,
      creatorId: entity.creatorId || null,
      creationMethod: this.determineCreationMethod(entity.type),
      creationTime: this.yearToDate(entity.createdAt),
      history: entity.events.map(event => ({
        id: event.id,
        timestamp: this.yearToDate(event.year),
        type: event.type,
        description: event.summary,
        actors: this.extractActorIds(event.metadata),
        relatedContentIds: this.extractRelatedContentIds(event.metadata),
      })),
      age: this.calculateAge(entity.createdAt),
      location: entity.location || undefined,
      materials: entity.metadata.materials as string[] | undefined,
    };

    this.provenance.set(worldContentId, provenanceEntry);
    return provenanceEntry;
  }

  /**
   * Create Lore entry for an entity
   */
  createLoreForEntity(entity: EntityData): LoreEntry {
    const worldContentId = entity.worldContentId || `worldcontent-${entity.entityId}`;
    
    const story = this.generateStory(entity);
    const significance = this.generateSignificance(entity);
    const connections = this.generateConnections(entity);

    const loreEntry: LoreEntry = {
      contentId: worldContentId,
      story,
      significance,
      connections,
      culturalContext: entity.race ? `Part of ${entity.race} culture` : undefined,
      enrichedAt: new Date(),
      version: 1,
    };

    this.lore.set(worldContentId, loreEntry);
    return loreEntry;
  }

  /**
   * Process an entity: create WorldContent, Provenance, and Lore
   */
  processEntity(entity: EntityData): {
    worldContent: WorldContentEntry;
    provenance: ProvenanceEntry;
    lore: LoreEntry;
  } {
    const worldContent = this.createWorldContentForEntity(entity);
    const provenance = this.createProvenanceForEntity(entity);
    const lore = this.createLoreForEntity(entity);

    // Update entity with worldContentId
    entity.worldContentId = worldContent.id;

    return { worldContent, provenance, lore };
  }

  /**
   * Get WorldContent entry by ID
   */
  getWorldContent(contentId: string): WorldContentEntry | undefined {
    return this.worldContent.get(contentId);
  }

  /**
   * Get Provenance entry by content ID
   */
  getProvenance(contentId: string): ProvenanceEntry | undefined {
    return this.provenance.get(contentId);
  }

  /**
   * Get Lore entry by content ID
   */
  getLore(contentId: string): LoreEntry | undefined {
    return this.lore.get(contentId);
  }

  // Private helper methods

  private mapEntityTypeToWorldContentType(entityType: string): string {
    const mapping: Record<string, string> = {
      'primordial': 'world',
      'cosmic_creator': 'civilization',
      'geography': 'region',
      'conceptual_being': 'creature',
      'demigod': 'creature',
      'mortal_race': 'civilization',
      'organization': 'location',
      'standout_mortal': 'creature',
      'legendary_item': 'item',
    };
    return mapping[entityType] || 'event';
  }

  private determineCreationMethod(entityType: string): string {
    const methods: Record<string, string> = {
      'primordial': 'formed',
      'cosmic_creator': 'created',
      'geography': 'formed',
      'conceptual_being': 'born',
      'demigod': 'created',
      'mortal_race': 'created',
      'organization': 'founded',
      'standout_mortal': 'born',
      'legendary_item': 'forged',
    };
    return methods[entityType] || 'created';
  }

  private generateDescription(entity: EntityData): string {
    const typeDescriptions: Record<string, string> = {
      'primordial': `The fundamental force of ${entity.name}`,
      'cosmic_creator': `An elemental being that shapes ${entity.metadata.element || 'the world'}`,
      'geography': `A geographical feature: ${entity.name}`,
      'conceptual_being': `A god born from the worship of ${entity.race || 'mortals'}`,
      'demigod': `A demi-god of great power`,
      'mortal_race': `The ${entity.name} race`,
      'organization': `An organization: ${entity.name}`,
      'standout_mortal': `A notable individual: ${entity.name}`,
      'legendary_item': `A legendary item: ${entity.name}`,
    };
    return typeDescriptions[entity.type] || entity.name;
  }

  private generateStory(entity: EntityData): string {
    const creator = entity.creatorId 
      ? this.entityRegistry.getEntity(entity.creatorId)?.name 
      : null;
    
    const stories: Record<string, (entity: EntityData, creator: string | null) => string> = {
      'primordial': (e) => `${e.name} is one of the fundamental forces of existence, existing before all else.`,
      'cosmic_creator': (e, c) => `${e.name} was ${c ? `formed from ${c}` : 'created'} and began shaping the physical world.`,
      'geography': (e, c) => `${e.name} was ${c ? `formed by ${c}` : 'created'} ${this.calculateAge(e.createdAt) || 'long'} years ago.`,
      'conceptual_being': (e) => `${e.name} was born from the collective worship and emotion of the ${e.race || 'mortals'}.`,
      'mortal_race': (e, c) => `The ${e.name} ${c ? `were created by ${c}` : 'emerged'} and established their civilization.`,
      'organization': (e, c) => `${e.name} was ${c ? `founded by ${c}` : 'established'} ${this.calculateAge(e.createdAt) || 'recently'}.`,
      'standout_mortal': (e) => `${e.name} is a notable figure in the world's history.`,
      'legendary_item': (e, c) => `${e.name} was ${c ? `forged by ${c}` : 'created'} ${this.calculateAge(e.createdAt) || 'long'} years ago.`,
    };

    const generator = stories[entity.type];
    return generator ? generator(entity, creator) : `The story of ${entity.name}.`;
  }

  private generateSignificance(entity: EntityData): string {
    const significances: Record<string, string> = {
      'primordial': 'A fundamental force that shapes reality itself.',
      'cosmic_creator': 'An elemental being responsible for shaping the world.',
      'geography': 'A significant geographical feature that influences the region.',
      'conceptual_being': 'A god worshiped by mortals, representing a powerful concept.',
      'mortal_race': 'A race of mortals that has shaped the world.',
      'organization': 'An organization that has influenced history.',
      'standout_mortal': 'An individual who has left their mark on history.',
      'legendary_item': 'A legendary item of great power and significance.',
    };
    return significances[entity.type] || 'An important part of the world.';
  }

  private generateConnections(entity: EntityData): Array<{
    targetId: string;
    relationship: string;
    strength: 'weak' | 'moderate' | 'strong';
    description: string;
  }> {
    const connections: Array<{
      targetId: string;
      relationship: string;
      strength: 'weak' | 'moderate' | 'strong';
      description: string;
    }> = [];

    // Creator connection
    if (entity.creatorId) {
      connections.push({
        targetId: entity.creatorId,
        relationship: 'created_by',
        strength: 'strong',
        description: `Created by ${this.entityRegistry.getEntity(entity.creatorId)?.name || 'unknown'}`,
      });
    }

    // Origin connection
    if (entity.originId && entity.originId !== entity.creatorId) {
      connections.push({
        targetId: entity.originId,
        relationship: 'originated_from',
        strength: 'moderate',
        description: `Originated from ${this.entityRegistry.getEntity(entity.originId)?.name || 'unknown'}`,
      });
    }

    // Location connection
    if (entity.location) {
      connections.push({
        targetId: entity.location,
        relationship: 'located_in',
        strength: 'moderate',
        description: `Located in ${this.entityRegistry.getEntity(entity.location)?.name || 'unknown'}`,
      });
    }

    // Created entities connections
    const created = this.entityRegistry.getCreatedEntities(entity.entityId);
    created.forEach(createdEntity => {
      connections.push({
        targetId: createdEntity.entityId,
        relationship: 'created',
        strength: 'strong',
        description: `Created ${createdEntity.name}`,
      });
    });

    return connections;
  }

  private extractActorIds(metadata: Record<string, unknown>): string[] {
    const actors: string[] = [];
    if (metadata.entityId) actors.push(metadata.entityId as string);
    if (metadata.actorId) actors.push(metadata.actorId as string);
    if (metadata.founderId) actors.push(metadata.founderId as string);
    if (metadata.mortalName && metadata.entityId) actors.push(metadata.entityId as string);
    return actors;
  }

  private extractRelatedContentIds(metadata: Record<string, unknown>): string[] {
    const related: string[] = [];
    if (metadata.organizationId) related.push(metadata.organizationId as string);
    if (metadata.locationId) related.push(metadata.locationId as string);
    if (metadata.targetId) related.push(metadata.targetId as string);
    return related;
  }

  private yearToDate(year: number): Date {
    // Convert in-world year to approximate Date
    // Assuming year 0 = present day, negative years = past
    const now = new Date();
    const yearsAgo = year < 0 ? Math.abs(year) : 0;
    return new Date(now.getTime() - yearsAgo * 365 * 24 * 60 * 60 * 1000);
  }

  private calculateAge(createdAt: number): number | null {
    if (!createdAt) return null;
    const currentYear = 0; // Present day
    return currentYear - createdAt;
  }
}

