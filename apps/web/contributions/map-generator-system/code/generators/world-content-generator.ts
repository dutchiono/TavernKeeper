/**
 * World Content Generator
 * 
 * Generates WorldContent entries for all entities using templates.
 * Creates Provenance chains, Lore entries, and links entities together.
 */

import type { EntityData, EntityRegistry } from '../core/entity-registry';
import type { WorldContentIntegration, WorldContentEntry, ProvenanceEntry, LoreEntry } from '../integration/world-content-integration';

export class WorldContentGenerator {
  private entityRegistry: EntityRegistry;
  private worldContentIntegration: WorldContentIntegration;

  constructor(entityRegistry: EntityRegistry, worldContentIntegration: WorldContentIntegration) {
    this.entityRegistry = entityRegistry;
    this.worldContentIntegration = worldContentIntegration;
  }

  /**
   * Generate WorldContent entry for an entity
   */
  generateForEntity(entity: EntityData): {
    worldContent: WorldContentEntry;
    provenance: ProvenanceEntry;
    lore: LoreEntry;
  } {
    return this.worldContentIntegration.processEntity(entity);
  }

  /**
   * Generate WorldContent for all registered entities
   */
  generateForAllEntities(): Array<{
    entity: EntityData;
    worldContent: WorldContentEntry;
    provenance: ProvenanceEntry;
    lore: LoreEntry;
  }> {
    const allEntities = this.entityRegistry.getAllEntities();
    return allEntities.map(entity => ({
      entity,
      ...this.generateForEntity(entity),
    }));
  }

  /**
   * Get WorldContent entry by entity ID
   */
  getWorldContentForEntity(entityId: string): WorldContentEntry | undefined {
    const entity = this.entityRegistry.getEntity(entityId);
    if (!entity || !entity.worldContentId) return undefined;
    return this.worldContentIntegration.getWorldContent(entity.worldContentId);
  }

  /**
   * Get Provenance entry by entity ID
   */
  getProvenanceForEntity(entityId: string): ProvenanceEntry | undefined {
    const entity = this.entityRegistry.getEntity(entityId);
    if (!entity || !entity.worldContentId) return undefined;
    return this.worldContentIntegration.getProvenance(entity.worldContentId);
  }

  /**
   * Get Lore entry by entity ID
   */
  getLoreForEntity(entityId: string): LoreEntry | undefined {
    const entity = this.entityRegistry.getEntity(entityId);
    if (!entity || !entity.worldContentId) return undefined;
    return this.worldContentIntegration.getLore(entity.worldContentId);
  }
}

