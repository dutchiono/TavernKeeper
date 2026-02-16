// Hero NFT Trait System
// Defines all possible traits for hero image generation

export const HERO_CLASSES = {
  WARRIOR: 'Warrior',
  MAGE: 'Mage',
  ROGUE: 'Rogue',
  CLERIC: 'Cleric',
} as const;

export const HERO_RACES = {
  HUMAN: 'Human',
  ELF: 'Elf',
  DWARF: 'Dwarf',
  ORC: 'Orc',
} as const;

export const HERO_WEAPONS = {
  Warrior: ['Sword', 'Axe', 'Hammer'],
  Mage: ['Staff', 'Wand', 'Orb'],
  Rogue: ['Daggers', 'Bow', 'Shortbow'],
  Cleric: ['Mace', 'Staff', 'Holy Symbol'],
} as const;

export const HERO_ARMOR = {
  Warrior: ['Heavy Plate', 'Chainmail'],
  Mage: ['Robes', 'Light Cloth'],
  Rogue: ['Leather', 'Light Armor'],
  Cleric: ['Medium Armor', 'Robes'],
} as const;

export const HERO_ACCESSORIES = [
  'Helmet',
  'Hood',
  'Crown',
  'Cape',
  'Amulet',
  'None',
] as const;

export const HERO_BACKGROUNDS = [
  'Forest Clearing',
  'Mountain Peak',
  'Dark Dungeon',
  'Castle Courtyard',
  'Mystical Portal',
  'Tavern Interior',
] as const;

export type HeroClass = typeof HERO_CLASSES[keyof typeof HERO_CLASSES];
export type HeroRace = typeof HERO_RACES[keyof typeof HERO_RACES];
export type HeroWeapon = string;
export type HeroArmor = string;
export type HeroAccessory = typeof HERO_ACCESSORIES[number];
export type HeroBackground = typeof HERO_BACKGROUNDS[number];

export interface HeroTraits {
  class: HeroClass;
  race: HeroRace;
  weapon: HeroWeapon;
  armor: HeroArmor;
  accessory: HeroAccessory;
  background: HeroBackground;
  name?: string;
}

/**
 * Generate random traits for a hero based on their class
 */
export function generateRandomTraits(heroClass: HeroClass, seed?: string): HeroTraits {
  // Use seed for deterministic randomness if provided
  const random = seed ? seededRandom(seed) : Math.random;

  const race = Object.values(HERO_RACES)[Math.floor(random() * Object.values(HERO_RACES).length)];
  const weapons = HERO_WEAPONS[heroClass];
  const weapon = weapons[Math.floor(random() * weapons.length)];
  const armors = HERO_ARMOR[heroClass];
  const armor = armors[Math.floor(random() * armors.length)];
  const accessory = HERO_ACCESSORIES[Math.floor(random() * HERO_ACCESSORIES.length)];
  const background = HERO_BACKGROUNDS[Math.floor(random() * HERO_BACKGROUNDS.length)];

  return {
    class: heroClass,
    race,
    weapon,
    armor,
    accessory,
    background,
  };
}

/**
 * Create a descriptive prompt for AI image generation
 */
export function createImagePrompt(traits: HeroTraits): string {
  const { class: heroClass, race, weapon, armor, accessory, background, name } = traits;

  let prompt = `Fantasy RPG character portrait, ${race} ${heroClass}`;

  // Add equipment details
  prompt += `, wielding ${weapon}, wearing ${armor}`;

  if (accessory !== 'None') {
    prompt += `, with ${accessory}`;
  }

  // Add setting
  prompt += `. Background: ${background}`;

  // Add style and quality descriptors
  prompt += '. High quality digital art, detailed character design, epic fantasy style, dramatic lighting';

  // Add class-specific details
  const classDetails: Record<HeroClass, string> = {
    Warrior: ', strong and battle-ready pose, muscular build',
    Mage: ', mystical aura, arcane energy effects, wise expression',
    Rogue: ', agile stance, stealthy appearance, cunning expression',
    Cleric: ', holy radiance, divine symbols, compassionate expression',
  };

  prompt += classDetails[heroClass];

  return prompt;
}

/**
 * Simple seeded random generator for deterministic trait generation
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return function() {
    hash = (hash * 9301 + 49297) % 233280;
    return hash / 233280;
  };
}

/**
 * Parse traits from hero metadata or generate defaults
 */
export function parseHeroTraits(hero: any): HeroTraits {
  // If hero has explicit traits in metadata, use them
  if (hero.traits) {
    return hero.traits;
  }

  // Otherwise generate from available data
  return generateRandomTraits(
    hero.class || 'Warrior',
    hero.token_id?.toString() || hero.id?.toString()
  );
}
