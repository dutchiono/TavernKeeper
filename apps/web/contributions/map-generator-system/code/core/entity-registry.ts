/**
 * Universal Entity Registry
 * 
 * Centralized registry for tracking all named entities in the world.
 * Every entity (primordials, creators, geography, races, organizations, mortals, items)
 * is registered here with full provenance and history tracking.
 */

export type EntityType =
  | 'primordial'
  | 'cosmic_creator'
  | 'geography'
  | 'conceptual_being'
  | 'demigod'
  | 'mortal_race'
  | 'organization'
  | 'standout_mortal'
  | 'legendary_item';

export interface EntityData {
  id: string;
  name: string;
  type: EntityType;
  entityId: string; // Unique identifier for this entity
  worldContentId?: string; // Link to world-content-hierarchy
  provenanceId?: string; // Link to provenance chain
  creatorId?: string; // Entity that created this
  originId?: string; // Entity this originated from
  race?: string; // For mortals, organizations, gods
  location?: string; // Geography entityId
  metadata: Record<string, unknown>;
  createdAt: number; // In-world year
  events: Array<{
    id: string;
    year: number;
    type: string;
    summary: string;
    importance: string;
    metadata: Record<string, unknown>;
  }>;
}

export interface ProvenanceChain {
  entityId: string;
  chain: Array<{
    entityId: string;
    name: string;
    type: EntityType;
    relationship: string; // 'created_by', 'born_from', 'worshiped_by', etc.
  }>;
}

export class EntityRegistry {
  private entities: Map<string, EntityData>;
  private creatorRelationships: Map<string, Set<string>>; // creatorId -> Set<createdEntityIds>
  private typeIndex: Map<EntityType, Set<string>>; // type -> Set<entityIds>
  private raceIndex: Map<string, Set<string>>; // race -> Set<entityIds>

  constructor() {
    this.entities = new Map();
    this.creatorRelationships = new Map();
    this.typeIndex = new Map();
    this.raceIndex = new Map();
  }

  /**
   * Register a new entity
   */
  registerEntity(entityId: string, data: Omit<EntityData, 'entityId' | 'events'>): EntityData {
    const entity: EntityData = {
      ...data,
      entityId,
      events: [],
    };

    this.entities.set(entityId, entity);

    // Index by type
    if (!this.typeIndex.has(data.type)) {
      this.typeIndex.set(data.type, new Set());
    }
    this.typeIndex.get(data.type)!.add(entityId);

    // Index by race (if applicable)
    if (data.race) {
      if (!this.raceIndex.has(data.race)) {
        this.raceIndex.set(data.race, new Set());
      }
      this.raceIndex.get(data.race)!.add(entityId);
    }

    // Track creator relationships
    if (data.creatorId) {
      if (!this.creatorRelationships.has(data.creatorId)) {
        this.creatorRelationships.set(data.creatorId, new Set());
      }
      this.creatorRelationships.get(data.creatorId)!.add(entityId);
    }

    return entity;
  }

  /**
   * Get an entity by ID
   */
  getEntity(entityId: string): EntityData | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Get all entities of a specific type
   */
  getEntitiesByType(type: EntityType): EntityData[] {
    const entityIds = this.typeIndex.get(type) || new Set();
    return Array.from(entityIds)
      .map(id => this.entities.get(id))
      .filter((e): e is EntityData => e !== undefined);
  }

  /**
   * Get all entities of a specific race
   */
  getEntitiesByRace(race: string): EntityData[] {
    const entityIds = this.raceIndex.get(race) || new Set();
    return Array.from(entityIds)
      .map(id => this.entities.get(id))
      .filter((e): e is EntityData => e !== undefined);
  }

  /**
   * Add an event to an entity's history
   */
  addEventToEntity(entityId: string, event: {
    id: string;
    year: number;
    type: string;
    summary: string;
    importance: string;
    metadata: Record<string, unknown>;
  }): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.events.push(event);
      // Keep events sorted by year
      entity.events.sort((a, b) => a.year - b.year);
    }
  }

  /**
   * Get entity history (all events for an entity)
   */
  getEntityHistory(entityId: string, minImportance: 'critical' | 'important' | 'normal' | 'verbose' = 'verbose'): Array<{
    id: string;
    year: number;
    type: string;
    summary: string;
    importance: string;
    metadata: Record<string, unknown>;
  }> {
    const entity = this.entities.get(entityId);
    if (!entity) return [];

    const importanceLevels = { 'critical': 4, 'important': 3, 'normal': 2, 'verbose': 1 };
    const minLevel = importanceLevels[minImportance] || 1;

    return entity.events.filter(e => {
      const level = importanceLevels[e.importance as keyof typeof importanceLevels] || 2;
      return level >= minLevel;
    });
  }

  /**
   * Get provenance chain (what created this entity, and what created that, etc.)
   */
  getProvenanceChain(entityId: string): ProvenanceChain {
    const chain: ProvenanceChain['chain'] = [];
    let currentId: string | undefined = entityId;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const entity = this.entities.get(currentId);
      if (!entity) break;

      chain.push({
        entityId: currentId,
        name: entity.name,
        type: entity.type,
        relationship: currentId === entityId ? 'self' : 'created_by',
      });

      // Move to creator
      currentId = entity.creatorId || entity.originId;
    }

    return { entityId, chain };
  }

  /**
   * Get what entities this entity created
   */
  getCreatedEntities(entityId: string): EntityData[] {
    const createdIds = this.creatorRelationships.get(entityId) || new Set();
    return Array.from(createdIds)
      .map(id => this.entities.get(id))
      .filter((e): e is EntityData => e !== undefined);
  }

  /**
   * Get related entities (entities that share connections)
   */
  getRelatedEntities(entityId: string): EntityData[] {
    const entity = this.entities.get(entityId);
    if (!entity) return [];

    const related = new Set<string>();

    // Add creator
    if (entity.creatorId) {
      related.add(entity.creatorId);
    }

    // Add origin
    if (entity.originId) {
      related.add(entity.originId);
    }

    // Add location
    if (entity.location) {
      related.add(entity.location);
    }

    // Add created entities
    const created = this.getCreatedEntities(entityId);
    created.forEach(e => related.add(e.entityId));

    // Add entities of same race
    if (entity.race) {
      const sameRace = this.getEntitiesByRace(entity.race);
      sameRace.forEach(e => {
        if (e.entityId !== entityId) {
          related.add(e.entityId);
        }
      });
    }

    return Array.from(related)
      .map(id => this.entities.get(id))
      .filter((e): e is EntityData => e !== undefined);
  }

  /**
   * Search entities by name
   */
  searchEntities(query: string): EntityData[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.entities.values()).filter(
      entity => entity.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get all entities
   */
  getAllEntities(): EntityData[] {
    return Array.from(this.entities.values());
  }

  /**
   * Clear all entities (for testing/reset)
   */
  clear(): void {
    this.entities.clear();
    this.creatorRelationships.clear();
    this.typeIndex.clear();
    this.raceIndex.clear();
  }
}

