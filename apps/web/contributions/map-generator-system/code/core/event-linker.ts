/**
 * Event Linker
 * 
 * Automatically extracts entity names from event summaries and links them to entities.
 * Enhances event logging to create clickable entity links in the UI.
 */

import type { EntityRegistry } from './entity-registry';

export interface EventMetadata {
  entityId?: string;
  organizationId?: string;
  founderId?: string;
  creatorId?: string;
  originId?: string;
  locationId?: string;
  raceEntityId?: string;
  name?: string;
  mortalName?: string;
  organizationName?: string;
  [key: string]: unknown;
}

export class EventLinker {
  private entityRegistry: EntityRegistry;

  constructor(entityRegistry: EntityRegistry) {
    this.entityRegistry = entityRegistry;
  }

  /**
   * Extract entity names from event summary and link them
   */
  linkEntitiesInSummary(summary: string, metadata: EventMetadata): {
    summary: string;
    linkedEntityIds: string[];
  } {
    const linkedEntityIds: string[] = [];
    let enhancedSummary = summary;

    // Extract all entity IDs from metadata
    const entityIds = [
      metadata.entityId,
      metadata.organizationId,
      metadata.founderId,
      metadata.creatorId,
      metadata.originId,
      metadata.locationId,
      metadata.raceEntityId,
    ].filter((id): id is string => id !== undefined);

    // For each entity ID, find the entity and replace its name in the summary
    entityIds.forEach(entityId => {
      const entity = this.entityRegistry.getEntity(entityId);
      if (entity) {
        linkedEntityIds.push(entityId);
        // Replace entity name in summary with a link marker (will be converted to HTML link in UI)
        const nameRegex = new RegExp(entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        enhancedSummary = enhancedSummary.replace(nameRegex, `[ENTITY:${entityId}:${entity.name}]`);
      }
    });

    return { summary: enhancedSummary, linkedEntityIds };
  }

  /**
   * Extract entity names from text and return potential matches
   */
  findEntityNamesInText(text: string): Array<{ entityId: string; name: string; startIndex: number; endIndex: number }> {
    const matches: Array<{ entityId: string; name: string; startIndex: number; endIndex: number }> = [];
    const allEntities = this.entityRegistry.getAllEntities();

    allEntities.forEach(entity => {
      const nameRegex = new RegExp(`\\b${entity.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match;
      while ((match = nameRegex.exec(text)) !== null) {
        matches.push({
          entityId: entity.entityId,
          name: entity.name,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    });

    // Sort by start index
    matches.sort((a, b) => a.startIndex - b.startIndex);

    return matches;
  }

  /**
   * Convert entity link markers to HTML links
   */
  convertLinksToHTML(text: string): string {
    // Pattern: [ENTITY:entityId:entityName]
    const linkPattern = /\[ENTITY:([^:]+):([^\]]+)\]/g;
    return text.replace(linkPattern, (match, entityId, entityName) => {
      return `<a href="#" class="entity-link" data-entity-id="${entityId}" data-entity-name="${entityName}">${entityName}</a>`;
    });
  }

  /**
   * Process event to add entity links
   */
  processEvent(summary: string, metadata: EventMetadata): {
    summary: string;
    htmlSummary: string;
    linkedEntityIds: string[];
  } {
    const { summary: linkedSummary, linkedEntityIds } = this.linkEntitiesInSummary(summary, metadata);
    const htmlSummary = this.convertLinksToHTML(linkedSummary);

    return {
      summary: linkedSummary,
      htmlSummary,
      linkedEntityIds,
    };
  }
}

