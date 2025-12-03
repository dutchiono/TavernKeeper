/**
 * World Generation Types
 * 
 * Defines types for all levels of world generation, from primordial beings
 * down to individual mortals and their roles.
 */

// Note: These types should be imported from @innkeeper/lib after integration
// For now, we define minimal required types
export interface WorldContent {
  id: string;
  type: string;
  name: string;
  description: string;
  parentId: string | null;
  createdAt: Date;
  discoveredAt: Date;
  metadata: Record<string, unknown>;
}

/**
 * Generation level identifiers
 */
export type GenerationLevel = 1 | 2 | 2.5 | 3 | 4 | 5 | 6 | 6.5 | 7;

/**
 * Level 1: Primordial Beings
 * Fundamental forces of the universe
 */
export type PrimordialType = 'space' | 'time' | 'light' | 'dark' | 'order' | 'chaos' | 'void' | 'eternity';

export interface PrimordialBeing extends WorldContent {
  type: 'primordial';
  primordialType: PrimordialType;
  domain: string; // What they represent
  influence: string[]; // What they influence
}

/**
 * Level 2: Cosmic Creators
 * Elemental beings that created the world
 */
export type CosmicElement = 'rock' | 'wind' | 'water' | 'life' | 'fire' | 'earth' | 'air' | 'ice' | 'lightning' | 'shadow';

export interface CosmicCreator extends WorldContent {
  type: 'cosmic_creator';
  element: CosmicElement;
  createdBy: string; // Primordial being ID
  creations: string[]; // What they created (geography, races, etc.)
}

/**
 * Level 2.5: Geography
 * Physical features of the world
 */
export type GeographyType = 
  | 'continent'
  | 'ocean'
  | 'mountain_range'
  | 'river'
  | 'underground_system'
  | 'forest'
  | 'desert'
  | 'plains'
  | 'island'
  | 'volcano'
  | 'cave_system';

export interface Geography extends WorldContent {
  type: 'geography';
  geographyType: GeographyType;
  createdBy: string; // Cosmic creator ID
  magnitude: 'vast' | 'large' | 'medium' | 'small'; // Size scale
  location?: { x: number; y: number }; // Optional coordinates
}

/**
 * Level 3: Conceptual Beings
 * Born from mortal worship and emotion
 */
export type ConceptualType = 
  | 'luck'
  | 'love'
  | 'fertility'
  | 'justice'
  | 'war'
  | 'death'
  | 'wisdom'
  | 'wealth'
  | 'art'
  | 'music'
  | 'craft'
  | 'hunting'
  | 'harvest';

export interface ConceptualBeing extends WorldContent {
  type: 'conceptual';
  conceptualType: ConceptualType;
  worshipedBy: string[]; // Races/organizations that worship
  domain: string; // What concept they represent
  manifestations: string[]; // How they manifest
}

/**
 * Level 4: Demi-Gods
 * Divine experiments and ancient beings
 */
export type DemiGodType = 
  | 'half_god'
  | 'ancient_creature'
  | 'divine_experiment'
  | 'fallen_divine'
  | 'ascended_mortal'
  | 'primordial_spawn';

export interface DemiGod extends WorldContent {
  type: 'demigod';
  demiGodType: DemiGodType;
  origin: string; // What created them (primordial, cosmic, or conceptual)
  age: number; // Age in years (often very old)
  powers: string[]; // Special abilities
  alignment?: 'good' | 'neutral' | 'evil';
}

/**
 * Level 5: Mortal Races
 * Variety of life
 */
export type MortalRaceType = 
  | 'human'
  | 'orc'
  | 'goblin'
  | 'elf'
  | 'dwarf'
  | 'halfling'
  | 'dragon'
  | 'beast'
  | 'undead'
  | 'construct'
  | 'elemental'
  | 'fey'
  | 'giant';

export interface MortalRace extends WorldContent {
  type: 'mortal_race';
  raceType: MortalRaceType;
  createdBy: string; // Cosmic creator or demi-god ID
  homeland: string; // Geography ID where they originated
  characteristics: string[]; // Racial traits
  lifespan: { min: number; max: number }; // Age range
  population?: number; // Estimated population
}

/**
 * Level 6: Organizations
 * Named groups organized by magnitude
 */
export type OrganizationMagnitude = 
  | 'empire'      // Largest
  | 'kingdom'     // Large
  | 'horde'       // Large (for orcs, etc.)
  | 'realm'       // Large (for elves, etc.)
  | 'city'        // Medium-large
  | 'town'        // Medium
  | 'tribe'       // Medium
  | 'guild'       // Medium
  | 'band'        // Small
  | 'clan'        // Small
  | 'circle'      // Small
  | 'company';    // Small

export interface Organization extends WorldContent {
  type: 'organization';
  magnitude: OrganizationMagnitude;
  race: string; // Mortal race ID (primary race)
  location: string; // Geography ID
  leader?: string; // Standout mortal ID
  members: number; // Estimated membership
  purpose: string; // What the organization does
  founded?: Date; // When founded
}

/**
 * Level 6.5: Standout Mortals
 * Heroes, villains, and powerful individuals
 */
export type StandoutType = 
  | 'hero'
  | 'villain'
  | 'wizard'
  | 'king'
  | 'war_chief'
  | 'vampire'
  | 'lich'
  | 'dragon_lord'
  | 'dungeon_boss'
  | 'archmage'
  | 'high_priest'
  | 'master_thief'
  | 'legendary_warrior';

export interface StandoutMortal extends WorldContent {
  type: 'standout_mortal';
  standoutType: StandoutType;
  race: string; // Mortal race ID
  organization?: string; // Organization ID (if part of one)
  location: string; // Geography ID
  powers: string[]; // Special abilities
  level: number; // Power level (1-100)
  age: number; // Current age
  alignment?: 'good' | 'neutral' | 'evil';
  isBoss: boolean; // Is this a dungeon boss?
}

/**
 * Level 7: Family and Role
 * Individual mortals and their place in history
 */
export type RoleType = 
  | 'blacksmith'
  | 'playwright'
  | 'assassin'
  | 'princess'
  | 'merchant'
  | 'farmer'
  | 'soldier'
  | 'scholar'
  | 'priest'
  | 'noble'
  | 'commoner'
  | 'artisan'
  | 'bard'
  | 'ranger'
  | 'knight';

export interface FamilyMember extends WorldContent {
  type: 'family_member';
  role: RoleType;
  race: string; // Mortal race ID
  family?: string; // Family lineage ID
  parent?: string; // Parent family member ID
  organization?: string; // Organization ID
  location: string; // Geography ID
  birthDate?: Date;
  deathDate?: Date;
  notableActions: string[]; // Significant things they did
  connections: Array<{
    targetId: string;
    relationship: 'created' | 'influenced' | 'served' | 'betrayed' | 'loved' | 'hated';
    description: string;
  }>;
}

/**
 * Family lineage
 */
export interface FamilyLineage {
  id: string;
  name: string;
  race: string;
  origin: string; // Geography ID
  members: string[]; // Family member IDs
  notableMembers: string[]; // Standout mortals in the family
  history: string; // Family history
  founded?: Date;
}

/**
 * World generation configuration
 */
export interface WorldGenerationConfig {
  seed: string;
  includeLevels?: GenerationLevel[]; // Which levels to generate
  depth?: 'full' | 'partial' | 'minimal'; // Generation depth
  customPrimordials?: PrimordialType[]; // Custom primordial types
  customRaces?: MortalRaceType[]; // Custom race types
  geographyDensity?: 'sparse' | 'normal' | 'dense'; // How much geography
  organizationDensity?: 'sparse' | 'normal' | 'dense'; // How many organizations
}

/**
 * Generated world result
 */
export interface GeneratedWorld {
  seed: string;
  primordials: PrimordialBeing[];
  cosmicCreators: CosmicCreator[];
  geography: Geography[];
  conceptualBeings: ConceptualBeing[];
  demiGods: DemiGod[];
  mortalRaces: MortalRace[];
  organizations: Organization[];
  standoutMortals: StandoutMortal[];
  familyMembers: FamilyMember[];
  familyLineages: FamilyLineage[];
  generatedAt: Date;
}

/**
 * Generation context (passed between generators)
 */
export interface GenerationContext {
  seed: string;
  rng: () => number; // Seeded random number generator
  primordials: PrimordialBeing[];
  cosmicCreators: CosmicCreator[];
  geography: Geography[];
  conceptualBeings: ConceptualBeing[];
  demiGods: DemiGod[];
  mortalRaces: MortalRace[];
  organizations: Organization[];
  standoutMortals: StandoutMortal[];
}

