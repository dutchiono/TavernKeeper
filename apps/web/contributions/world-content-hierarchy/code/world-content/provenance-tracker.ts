import type {
  Provenance,
  HistoricalEvent,
  CreationMethod,
  WorldContentType,
} from '../types/world-content';

/**
 * Provenance Tracker
 * 
 * Tracks and manages provenance chains for world content elements.
 * Answers the question "where did this come from?"
 */
export class ProvenanceTracker {
  /**
   * Create provenance for a new world content element
   */
  createProvenance(
    contentId: string,
    type: WorldContentType,
    creationMethod: CreationMethod,
    originId: string | null = null,
    creatorId: string | null = null,
    creationTime: Date | null = null
  ): Provenance {
    const now = new Date();
    const age = creationTime
      ? Math.floor((now.getTime() - creationTime.getTime()) / (1000 * 60 * 60 * 24 * 365))
      : null;

    const provenance: Provenance = {
      contentId,
      originId,
      creatorId,
      creationMethod,
      creationTime,
      history: [],
      age,
    };

    // Add creation event to history
    if (creationTime) {
      provenance.history.push({
        id: `event-${contentId}-creation`,
        timestamp: creationTime,
        type: 'creation',
        description: this.generateCreationDescription(type, creationMethod, creatorId),
        actors: creatorId ? [creatorId] : [],
        relatedContentIds: originId ? [originId] : [],
      });
    }

    return provenance;
  }

  /**
   * Add a historical event to provenance
   */
  addHistoricalEvent(
    provenance: Provenance,
    event: Omit<HistoricalEvent, 'id'>
  ): Provenance {
    const newEvent: HistoricalEvent = {
      ...event,
      id: `event-${provenance.contentId}-${Date.now()}`,
    };

    return {
      ...provenance,
      history: [...provenance.history, newEvent].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
    };
  }

  /**
   * Update provenance when element is discovered
   */
  addDiscovery(
    provenance: Provenance,
    discoveredBy: string[],
    discoveredAt: Date
  ): Provenance {
    return this.addHistoricalEvent(provenance, {
      timestamp: discoveredAt,
      type: 'discovery',
      description: `Discovered by ${discoveredBy.join(', ')}`,
      actors: discoveredBy,
      relatedContentIds: [],
    });
  }

  /**
   * Update provenance when element is conquered/defeated
   */
  addConquest(
    provenance: Provenance,
    conqueredBy: string[],
    conqueredAt: Date
  ): Provenance {
    return this.addHistoricalEvent(provenance, {
      timestamp: conqueredAt,
      type: 'conquest',
      description: `Conquered by ${conqueredBy.join(', ')}`,
      actors: conqueredBy,
      relatedContentIds: [],
    });
  }

  /**
   * Update provenance when element is transferred (e.g., item ownership)
   */
  addTransfer(
    provenance: Provenance,
    from: string | null,
    to: string[],
    transferredAt: Date,
    reason?: string
  ): Provenance {
    const description = from
      ? `Transferred from ${from} to ${to.join(', ')}${reason ? ` (${reason})` : ''}`
      : `Acquired by ${to.join(', ')}${reason ? ` (${reason})` : ''}`;

    return this.addHistoricalEvent(provenance, {
      timestamp: transferredAt,
      type: 'transfer',
      description,
      actors: [...(from ? [from] : []), ...to],
      relatedContentIds: [],
    });
  }

  /**
   * Generate creation description
   */
  private generateCreationDescription(
    type: WorldContentType,
    method: CreationMethod,
    creatorId: string | null
  ): string {
    const creator = creatorId ? ` by ${creatorId}` : '';
    
    const descriptions: Record<CreationMethod, string> = {
      built: `Built${creator}`,
      forged: `Forged${creator}`,
      born: `Born${creator ? ` to ${creator}` : ''}`,
      discovered: `Discovered${creator}`,
      created: `Created${creator}`,
      formed: `Formed${creator ? ` by ${creator}` : ''}`,
      conquered: `Conquered${creator}`,
      founded: `Founded${creator}`,
      crafted: `Crafted${creator}`,
      summoned: `Summoned${creator}`,
      evolved: `Evolved${creator ? ` from ${creator}` : ''}`,
    };

    return descriptions[method];
  }

  /**
   * Calculate age from creation time
   */
  calculateAge(creationTime: Date | null): number | null {
    if (!creationTime) return null;
    const now = new Date();
    return Math.floor((now.getTime() - creationTime.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }

  /**
   * Get provenance chain (recursive parent lookup)
   * This would be implemented with database queries in production
   */
  async getProvenanceChain(
    contentId: string,
    getParent: (id: string) => Promise<{ id: string; name: string; type: WorldContentType; parentId: string | null } | null>
  ): Promise<Array<{ id: string; name: string; type: WorldContentType; relationship: string }>> {
    const chain: Array<{ id: string; name: string; type: WorldContentType; relationship: string }> = [];
    let currentId: string | null = contentId;

    while (currentId) {
      const content = await getParent(currentId);
      if (!content) break;

      chain.push({
        id: content.id,
        name: content.name,
        type: content.type,
        relationship: this.getRelationshipType(content.type),
      });

      currentId = content.parentId;
    }

    return chain.reverse(); // Return from root to current
  }

  /**
   * Get relationship type based on content type
   */
  private getRelationshipType(type: WorldContentType): string {
    const relationships: Record<WorldContentType, string> = {
      world: 'part of',
      region: 'located in',
      location: 'located in',
      dungeon: 'found in',
      room: 'part of',
      encounter: 'occurs in',
      item: 'found in',
      boss: 'dwells in',
      creature: 'inhabits',
      civilization: 'originated from',
      event: 'occurred in',
    };

    return relationships[type] || 'related to';
  }
}







