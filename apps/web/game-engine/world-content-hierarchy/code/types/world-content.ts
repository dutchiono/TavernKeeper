/**
 * World Content Hierarchy Types
 * 
 * Defines the structure for tracking world elements, their provenance,
 * and their hierarchical relationships.
 */

/**
 * Types of world content elements
 */
export type WorldContentType =
  | 'world'
  | 'region'
  | 'location'
  | 'dungeon'
  | 'room'
  | 'encounter'
  | 'item'
  | 'boss'
  | 'creature'
  | 'civilization'
  | 'event';

/**
 * Base world content element
 */
export interface WorldContent {
  id: string;
  type: WorldContentType;
  name: string;
  description: string;
  parentId: string | null; // Parent in hierarchy
  createdAt: Date; // When created in-world
  discoveredAt: Date; // When discovered by players
  metadata: Record<string, unknown>; // Type-specific data
}

/**
 * Provenance information - answers "where did this come from?"
 */
export interface Provenance {
  contentId: string;
  originId: string | null; // Parent element that spawned this
  creatorId: string | null; // Specific creator entity (civilization, person, etc.)
  creationMethod: CreationMethod;
  creationTime: Date | null; // In-world creation time
  history: HistoricalEvent[];
  age: number | null; // Calculated age in years
  materials?: string[]; // For items: what it's made of
  location?: string; // Where it was created/found
}

/**
 * Methods of creation
 */
export type CreationMethod =
  | 'built'
  | 'forged'
  | 'born'
  | 'discovered'
  | 'created'
  | 'formed'
  | 'conquered'
  | 'founded'
  | 'crafted'
  | 'summoned'
  | 'evolved';

/**
 * Historical event in an element's history
 */
export interface HistoricalEvent {
  id: string;
  timestamp: Date; // In-world time
  type: 'creation' | 'discovery' | 'conquest' | 'destruction' | 'modification' | 'transfer' | 'significant';
  description: string;
  actors: string[]; // IDs of entities involved
  relatedContentIds: string[]; // Related world content
}

/**
 * Lore information - the story and significance
 */
export interface Lore {
  contentId: string;
  story: string; // Narrative description
  significance: string; // Why this element matters
  connections: ContentConnection[];
  culturalContext?: string; // Cultural/historical context
  enrichedAt: Date; // When lore was last enriched
  version: number; // Lore version (increases with enrichment)
}

/**
 * Connection between world content elements
 */
export interface ContentConnection {
  targetId: string; // Connected element
  relationship: RelationshipType;
  strength: 'weak' | 'moderate' | 'strong'; // Connection strength
  description: string; // How they're connected
}

/**
 * Types of relationships between elements
 */
export type RelationshipType =
  | 'built_by'
  | 'contains'
  | 'located_in'
  | 'created_by'
  | 'owned_by'
  | 'defeated_by'
  | 'discovered_in'
  | 'related_to'
  | 'influenced_by'
  | 'conflicts_with'
  | 'allied_with'
  | 'dwells_in'
  | 'found_in';

/**
 * Complete world content entry with all information
 */
export interface WorldContentEntry {
  content: WorldContent;
  provenance: Provenance;
  lore: Lore;
}

/**
 * Query options for world content
 */
export interface WorldContentQuery {
  type?: WorldContentType[];
  parentId?: string;
  creatorId?: string;
  originId?: string;
  region?: string;
  location?: string;
  hasConnection?: string; // Content ID to find connections
  searchText?: string; // Search in name/description
  limit?: number;
  offset?: number;
}

/**
 * Provenance chain - full chain of origin
 */
export interface ProvenanceChain {
  contentId: string;
  chain: Array<{
    contentId: string;
    name: string;
    type: WorldContentType;
    relationship: string;
  }>;
}

/**
 * Dungeon content creation data
 */
export interface DungeonContentData {
  dungeonId: string;
  dungeonSeed: string;
  name: string;
  location?: string; // Region/location name
  clearedBy?: string[]; // Party/agent IDs
  clearedAt?: Date;
  discoveredItems?: string[]; // Item IDs found
  defeatedBosses?: string[]; // Boss IDs defeated
  rooms?: number;
  depth?: number;
}

/**
 * Item content creation data
 */
export interface ItemContentData {
  itemId: string;
  itemSeed: string;
  name: string;
  type: string; // Weapon, armor, etc.
  rarity: string;
  foundIn?: string; // Dungeon/location ID
  foundBy?: string[]; // Party/agent IDs
  foundAt?: Date;
  material?: string;
  previousOwners?: string[];
}

/**
 * Boss content creation data
 */
export interface BossContentData {
  bossId: string;
  bossSeed: string;
  name: string;
  type: string;
  location?: string; // Dungeon/location ID
  defeatedBy?: string[]; // Party/agent IDs
  defeatedAt?: Date;
  relatedLocations?: string[];
  relatedItems?: string[];
}

/**
 * Civilization/entity data for creators
 */
export interface Civilization {
  id: string;
  name: string;
  type: 'civilization' | 'tribe' | 'organization' | 'individual' | 'entity';
  era: string; // Time period
  region?: string;
  characteristics: string[];
  knownFor: string[];
  activePeriod?: {
    start: Date;
    end: Date | null; // null if still active
  };
}







