/**
 * Item Provenance Tracker
 * 
 * Tracks legendary items (Rare/Epic) from procedural-item-generation as entities.
 * Creates full provenance chains linking items to creators, locations, and previous owners.
 */

import type { EntityRegistry } from '../core/entity-registry';
import type { WorldContentIntegration } from './world-content-integration';

export interface LegendaryItemData {
  itemId: string;
  name: string;
  rarity: 'rare' | 'epic';
  type: string; // weapon, armor
  level: number;
  seed: string;
  creatorId?: string; // Entity ID of creator (blacksmith, enchanter, etc.)
  locationId?: string; // Entity ID of location found (dungeon, boss, etc.)
  previousOwners?: string[]; // Entity IDs of previous owners
  materials?: string[];
  foundAt?: number; // In-world year
}

export class ItemProvenanceTracker {
  private entityRegistry: EntityRegistry;
  private worldContentIntegration: WorldContentIntegration;

  constructor(entityRegistry: EntityRegistry, worldContentIntegration: WorldContentIntegration) {
    this.entityRegistry = entityRegistry;
    this.worldContentIntegration = worldContentIntegration;
  }

  /**
   * Register a legendary item as an entity
   */
  registerLegendaryItem(itemData: LegendaryItemData): string {
    const entityId = `legendary-item-${itemData.itemId}`;

    // Generate creator name if not provided
    let creatorName = 'Unknown Artisan';
    if (itemData.creatorId) {
      const creator = this.entityRegistry.getEntity(itemData.creatorId);
      if (creator) {
        creatorName = creator.name;
      }
    }

    // Generate location name if not provided
    let locationName = 'Unknown Location';
    if (itemData.locationId) {
      const location = this.entityRegistry.getEntity(itemData.locationId);
      if (location) {
        locationName = location.name;
      }
    }

    // Calculate age
    const currentYear = 0; // Present day
    const age = itemData.foundAt ? currentYear - itemData.foundAt : null;

    // Register entity
    this.entityRegistry.registerEntity(entityId, {
      id: entityId,
      name: itemData.name,
      type: 'legendary_item',
      creatorId: itemData.creatorId,
      originId: itemData.creatorId,
      location: itemData.locationId,
      metadata: {
        rarity: itemData.rarity,
        itemType: itemData.type,
        level: itemData.level,
        materials: itemData.materials || [],
        previousOwners: itemData.previousOwners || [],
        creatorName,
        locationName,
      },
      createdAt: itemData.foundAt || currentYear,
    });

    // Generate WorldContent entry
    this.worldContentIntegration.processEntity(
      this.entityRegistry.getEntity(entityId)!
    );

    // Log creation event
    const creationYear = itemData.foundAt || currentYear;
    const provenance = this.worldContentIntegration.getProvenance(
      this.entityRegistry.getEntity(entityId)!.worldContentId!
    );

    return entityId;
  }

  /**
   * Track item ownership transfer
   */
  transferOwnership(itemEntityId: string, fromEntityId: string | null, toEntityId: string): void {
    const item = this.entityRegistry.getEntity(itemEntityId);
    if (!item || item.type !== 'legendary_item') return;

    // Update previous owners
    const previousOwners = (item.metadata.previousOwners as string[]) || [];
    if (fromEntityId) {
      previousOwners.push(fromEntityId);
    }
    item.metadata.previousOwners = previousOwners;

    // Log transfer event
    const currentYear = 0;
    const fromEntity = fromEntityId ? this.entityRegistry.getEntity(fromEntityId) : null;
    const toEntity = this.entityRegistry.getEntity(toEntityId);

    if (toEntity) {
      const summary = fromEntity
        ? `${item.name} was transferred from ${fromEntity.name} to ${toEntity.name}.`
        : `${item.name} was acquired by ${toEntity.name}.`;

      // Add event to item's history
      this.entityRegistry.addEventToEntity(itemEntityId, {
        id: `transfer-${itemEntityId}-${Date.now()}`,
        year: currentYear,
        type: 'transfer',
        summary,
        importance: 'normal',
        metadata: {
          fromEntityId,
          toEntityId,
          itemEntityId,
        },
      });
    }
  }

  /**
   * Get item provenance chain
   */
  getItemProvenance(itemEntityId: string): {
    creator?: { entityId: string; name: string };
    location?: { entityId: string; name: string };
    previousOwners: Array<{ entityId: string; name: string }>;
    age: number | null;
  } {
    const item = this.entityRegistry.getEntity(itemEntityId);
    if (!item || item.type !== 'legendary_item') {
      return { previousOwners: [], age: null };
    }

    const creator = item.creatorId ? this.entityRegistry.getEntity(item.creatorId) : undefined;
    const location = item.location ? this.entityRegistry.getEntity(item.location) : undefined;
    const previousOwners = ((item.metadata.previousOwners as string[]) || [])
      .map(ownerId => {
        const owner = this.entityRegistry.getEntity(ownerId);
        return owner ? { entityId: ownerId, name: owner.name } : null;
      })
      .filter((owner): owner is { entityId: string; name: string } => owner !== null);

    const currentYear = 0;
    const age = item.createdAt ? currentYear - item.createdAt : null;

    return {
      creator: creator ? { entityId: creator.entityId, name: creator.name } : undefined,
      location: location ? { entityId: location.entityId, name: location.name } : undefined,
      previousOwners,
      age,
    };
  }
}

