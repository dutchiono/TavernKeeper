import type {
  WorldContent,
  ContentConnection,
  RelationshipType,
  WorldContentType,
} from '../types/world-content';

/**
 * Content Hierarchy Manager
 * 
 * Manages hierarchical relationships between world content elements.
 * Maintains parent-child relationships and builds connection graphs.
 */
export class ContentHierarchy {
  /**
   * Create a world content element with hierarchy
   */
  createContent(
    type: WorldContentType,
    name: string,
    description: string,
    parentId: string | null = null,
    metadata: Record<string, unknown> = {}
  ): WorldContent {
    return {
      id: this.generateId(type),
      type,
      name,
      description,
      parentId,
      createdAt: new Date(), // In-world creation time (could be calculated)
      discoveredAt: new Date(), // When discovered by players
      metadata,
    };
  }

  /**
   * Build connections between related elements
   */
  buildConnections(
    sourceId: string,
    sourceType: WorldContentType,
    relatedElements: Array<{
      id: string;
      type: WorldContentType;
      relationship: RelationshipType;
    }>
  ): ContentConnection[] {
    return relatedElements.map((element) => ({
      targetId: element.id,
      relationship: element.relationship,
      strength: this.determineConnectionStrength(sourceType, element.type, element.relationship),
      description: this.generateConnectionDescription(
        sourceType,
        element.type,
        element.relationship
      ),
    }));
  }

  /**
   * Determine connection strength
   */
  private determineConnectionStrength(
    sourceType: WorldContentType,
    targetType: WorldContentType,
    relationship: RelationshipType
  ): 'weak' | 'moderate' | 'strong' {
    // Strong connections
    if (
      (relationship === 'built_by' || relationship === 'created_by') &&
      (sourceType === 'dungeon' || sourceType === 'item' || sourceType === 'location')
    ) {
      return 'strong';
    }

    if (
      (relationship === 'located_in' || relationship === 'dwells_in') &&
      (sourceType === 'dungeon' || sourceType === 'room' || sourceType === 'encounter' || sourceType === 'boss')
    ) {
      return 'strong';
    }

    if (
      relationship === 'found_in' &&
      (sourceType === 'item' && targetType === 'dungeon')
    ) {
      return 'strong';
    }

    // Moderate connections
    if (
      relationship === 'related_to' ||
      relationship === 'influenced_by' ||
      relationship === 'allied_with'
    ) {
      return 'moderate';
    }

    // Weak connections
    return 'weak';
  }

  /**
   * Generate connection description
   */
  private generateConnectionDescription(
    sourceType: WorldContentType,
    targetType: WorldContentType,
    relationship: RelationshipType
  ): string {
    const descriptions: Record<RelationshipType, string> = {
      built_by: `was built by`,
      contains: `contains`,
      located_in: `is located in`,
      created_by: `was created by`,
      owned_by: `was owned by`,
      defeated_by: `was defeated by`,
      discovered_in: `was discovered in`,
      related_to: `is related to`,
      influenced_by: `was influenced by`,
      conflicts_with: `conflicts with`,
      allied_with: `is allied with`,
      dwells_in: `dwells in`,
      found_in: `was found in`,
    };

    return `${sourceType} ${descriptions[relationship]} ${targetType}`;
  }

  /**
   * Get parent chain (all ancestors)
   */
  async getParentChain(
    contentId: string,
    getParent: (id: string) => Promise<WorldContent | null>
  ): Promise<WorldContent[]> {
    const chain: WorldContent[] = [];
    let currentId: string | null = contentId;

    while (currentId) {
      const parent = await getParent(currentId);
      if (!parent || !parent.parentId) break;

      const grandparent = await getParent(parent.parentId);
      if (!grandparent) break;

      chain.push(grandparent);
      currentId = grandparent.parentId;
    }

    return chain.reverse();
  }

  /**
   * Get children (all descendants)
   */
  async getChildren(
    contentId: string,
    getChildren: (parentId: string) => Promise<WorldContent[]>
  ): Promise<WorldContent[]> {
    const direct = await getChildren(contentId);
    const all: WorldContent[] = [...direct];

    // Recursively get grandchildren
    for (const child of direct) {
      const grandchildren = await this.getChildren(child.id, getChildren);
      all.push(...grandchildren);
    }

    return all;
  }

  /**
   * Generate unique ID for content
   */
  private generateId(type: WorldContentType): string {
    const prefix = type.substring(0, 3).toUpperCase();
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Validate hierarchy (ensure no circular references)
   */
  validateHierarchy(
    content: WorldContent,
    getParent: (id: string) => Promise<WorldContent | null>
  ): Promise<boolean> {
    return this.checkCircularReference(content.id, content.parentId, getParent);
  }

  /**
   * Check for circular references
   */
  private async checkCircularReference(
    originalId: string,
    currentParentId: string | null,
    getParent: (id: string) => Promise<WorldContent | null>
  ): Promise<boolean> {
    if (!currentParentId) return true; // No parent, no cycle

    if (currentParentId === originalId) return false; // Circular reference!

    const parent = await getParent(currentParentId);
    if (!parent) return true; // No parent found, valid

    return this.checkCircularReference(originalId, parent.parentId, getParent);
  }
}







