/**
 * Procedural Item Generation System - Type Definitions
 * 
 * These types define the structure of generated items and generation options.
 */

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type ItemCategory = 'weapon' | 'armor';
export type GenerationContext = 'dungeon_loot' | 'monster_drop' | 'boss_drop' | 'vendor' | 'quest_reward';
export type PlayerClass = 'warrior' | 'mage' | 'rogue' | 'cleric' | 'any';

export interface GeneratedItem {
  id: string;
  name: string;
  type: string;
  category: ItemCategory;
  rarity: Rarity;
  level: number;
  context: GenerationContext;
  seed: number;
  itemType: string; // Base item type (e.g., "Longsword", "Full Plate")
  
  // Class restriction - REQUIRED for equipment validation
  requiredClass: PlayerClass;
  class?: PlayerClass; // Deprecated - use requiredClass instead
  
  // Weapon stats
  damage?: string;
  attackBonus?: string;
  
  // Armor stats
  ac?: string;
  
  // Properties and enhancements
  properties?: string;
  enhancements?: string[];
  
  // Description
  description?: string;
}

export interface GenerationOptions {
  context: GenerationContext;
  level: number;
  classPreference?: PlayerClass;
  rarityModifier?: number; // 0-200, default 100
  seed?: number | string | null;
}

export interface WeaponDefinition {
  type: string;
  damage: number;
  isMagic: boolean;
  requiredClass: PlayerClass;
}

export interface ArmorDefinition {
  type: string;
  baseAC: number;
  armorType: 'Light' | 'Medium' | 'Heavy';
  requiredClass: PlayerClass;
}

export interface ItemCounts {
  // Weapons
  'Longsword': number;
  'Staff': number;
  'Dagger': number;
  'Mace': number;
  // Armor
  'Full Plate': number;
  'Chain Mail': number;
  'Mage Robes': number;
  'Enchanted Cloak': number;
  'Leather Armor': number;
  'Studded Leather': number;
  'Scale Mail': number;
  'Breastplate': number;
}

