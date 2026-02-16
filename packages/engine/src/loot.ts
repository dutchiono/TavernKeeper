import type { Entity, Item, Weapon } from '@innkeeper/lib';
import type { RNG } from './rng';
import { d, rollDice } from './rng';

export interface LootTable {
  common: LootEntry[];
  uncommon: LootEntry[];
  rare: LootEntry[];
  legendary: LootEntry[];
}

export interface LootEntry {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  properties?: Record<string, unknown>;
  weight?: number; // Drop weight (higher = more common)
}

/**
 * Default loot tables by enemy type
 */
const LOOT_TABLES: Record<string, LootTable> = {
  default: {
    common: [
      { id: 'gold_small', name: 'Gold Coins', type: 'misc', properties: { amount: 10 }, weight: 50 },
      { id: 'potion_healing_minor', name: 'Minor Healing Potion', type: 'consumable', properties: { healing: 10 }, weight: 30 },
      { id: 'dagger', name: 'Rusty Dagger', type: 'weapon', properties: { die: 4, dieCount: 1, weaponType: 'melee' }, weight: 20 },
    ],
    uncommon: [
      { id: 'gold_medium', name: 'Gold Pouch', type: 'misc', properties: { amount: 50 }, weight: 40 },
      { id: 'potion_healing', name: 'Healing Potion', type: 'consumable', properties: { healing: 25 }, weight: 30 },
      { id: 'shortsword', name: 'Steel Shortsword', type: 'weapon', properties: { die: 6, dieCount: 1, weaponType: 'melee' }, weight: 30 },
    ],
    rare: [
      { id: 'gold_large', name: 'Gold Purse', type: 'misc', properties: { amount: 100 }, weight: 30 },
      { id: 'potion_healing_greater', name: 'Greater Healing Potion', type: 'consumable', properties: { healing: 50 }, weight: 20 },
      { id: 'longsword', name: 'Fine Longsword', type: 'weapon', properties: { die: 8, dieCount: 1, weaponType: 'melee' }, weight: 25 },
      { id: 'chainmail', name: 'Chainmail Armor', type: 'armor', properties: { acBonus: 2 }, weight: 25 },
    ],
    legendary: [
      { id: 'gold_treasure', name: 'Treasure Hoard', type: 'misc', properties: { amount: 500 }, weight: 20 },
      { id: 'potion_full_heal', name: 'Potion of Full Healing', type: 'consumable', properties: { healing: 999 }, weight: 15 },
      { id: 'greatsword_magic', name: 'Enchanted Greatsword', type: 'weapon', properties: { die: 10, dieCount: 2, weaponType: 'melee', magicBonus: 2 }, weight: 35 },
      { id: 'plate_armor', name: 'Plate Armor of Protection', type: 'armor', properties: { acBonus: 5 }, weight: 30 },
    ],
  },
  boss: {
    common: [],
    uncommon: [
      { id: 'gold_large', name: 'Gold Purse', type: 'misc', properties: { amount: 100 }, weight: 50 },
      { id: 'potion_healing_greater', name: 'Greater Healing Potion', type: 'consumable', properties: { healing: 50 }, weight: 50 },
    ],
    rare: [
      { id: 'gold_treasure', name: 'Treasure Hoard', type: 'misc', properties: { amount: 500 }, weight: 40 },
      { id: 'longsword_magic', name: 'Magic Longsword', type: 'weapon', properties: { die: 8, dieCount: 1, weaponType: 'melee', magicBonus: 1 }, weight: 30 },
      { id: 'chainmail_magic', name: 'Enchanted Chainmail', type: 'armor', properties: { acBonus: 3 }, weight: 30 },
    ],
    legendary: [
      { id: 'artifact_sword', name: 'Legendary Sword of Heroes', type: 'weapon', properties: { die: 12, dieCount: 2, weaponType: 'melee', magicBonus: 3 }, weight: 50 },
      { id: 'artifact_armor', name: 'Dragonscale Plate Armor', type: 'armor', properties: { acBonus: 8 }, weight: 50 },
    ],
  },
};

/**
 * Calculate loot drops based on enemy level and type
 */
export function generateLoot(
  entity: Entity,
  rng: RNG,
  enemyType: 'default' | 'boss' = 'default'
): Item[] {
  const loot: Item[] = [];
  const table = LOOT_TABLES[enemyType] || LOOT_TABLES.default;

  // Determine rarity rolls based on enemy level (if we had level tracking)
  const baseLevel = entity.stats.maxHp / 10; // Rough approximation from HP
  
  // Roll for number of items (1-3 for normal, 2-5 for boss)
  const numItems = enemyType === 'boss' 
    ? rollDice(1, 4, rng) + 1 // 2-5 items
    : rollDice(1, 3, rng); // 1-3 items

  for (let i = 0; i < numItems; i++) {
    // Determine rarity based on level and roll
    const rarityRoll = d(100, rng);
    let rarity: keyof LootTable;

    if (enemyType === 'boss') {
      // Bosses have better loot distribution
      if (rarityRoll <= 10) rarity = 'legendary';
      else if (rarityRoll <= 40) rarity = 'rare';
      else if (rarityRoll <= 80) rarity = 'uncommon';
      else rarity = 'common';
    } else {
      // Normal enemies
      if (rarityRoll <= 5) rarity = 'legendary';
      else if (rarityRoll <= 20) rarity = 'rare';
      else if (rarityRoll <= 50) rarity = 'uncommon';
      else rarity = 'common';
    }

    const pool = table[rarity];
    if (pool.length === 0) continue;

    // Select item from pool based on weight
    const item = selectWeightedItem(pool, rng);
    if (item) {
      loot.push({
        id: `${item.id}_${Date.now()}_${i}`,
        name: item.name,
        type: item.type,
        properties: item.properties,
      });
    }
  }

  return loot;
}

/**
 * Select an item from a weighted list
 */
function selectWeightedItem(items: LootEntry[], rng: RNG): LootEntry | null {
  if (items.length === 0) return null;

  const totalWeight = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = d(totalWeight, rng);

  for (const item of items) {
    const weight = item.weight || 1;
    if (roll <= weight) {
      return item;
    }
    roll -= weight;
  }

  return items[items.length - 1];
}

/**
 * Add item to entity inventory
 */
export function addItemToInventory(entity: Entity, item: Item): Entity {
  const inventory = entity.inventory || [];
  return {
    ...entity,
    inventory: [...inventory, item],
  };
}

/**
 * Remove item from entity inventory
 */
export function removeItemFromInventory(entity: Entity, itemId: string): Entity {
  const inventory = entity.inventory || [];
  return {
    ...entity,
    inventory: inventory.filter(i => i.id !== itemId),
  };
}

/**
 * Check if entity has item
 */
export function hasItem(entity: Entity, itemId: string): boolean {
  const inventory = entity.inventory || [];
  return inventory.some(i => i.id === itemId);
}

/**
 * Get all items of a specific type
 */
export function getItemsByType(entity: Entity, type: Item['type']): Item[] {
  const inventory = entity.inventory || [];
  return inventory.filter(i => i.type === type);
}

/**
 * Use a consumable item (healing potion, etc.)
 */
export function useConsumable(entity: Entity, itemId: string): { entity: Entity; used: boolean; effect?: string } {
  const inventory = entity.inventory || [];
  const item = inventory.find(i => i.id === itemId);

  if (!item || item.type !== 'consumable') {
    return { entity, used: false };
  }

  let updatedEntity = entity;
  let effect = '';

  // Apply consumable effects
  if (item.properties?.healing) {
    const healAmount = item.properties.healing as number;
    const newHp = Math.min(entity.stats.maxHp, entity.stats.hp + healAmount);
    updatedEntity = {
      ...entity,
      stats: {
        ...entity.stats,
        hp: newHp,
      },
    };
    effect = `Healed ${newHp - entity.stats.hp} HP`;
  }

  // Remove item from inventory
  updatedEntity = removeItemFromInventory(updatedEntity, itemId);

  return { entity: updatedEntity, used: true, effect };
}

/**
 * Equip a weapon (simplified - just returns weapon data)
 */
export function getWeaponFromItem(item: Item): Weapon | null {
  if (item.type !== 'weapon' || !item.properties) {
    return null;
  }

  const { die, dieCount, weaponType } = item.properties as { 
    die?: number; 
    dieCount?: number; 
    weaponType?: 'melee' | 'ranged' | 'magic';
  };

  if (!die || !dieCount || !weaponType) {
    return null;
  }

  return {
    name: item.name,
    die,
    dieCount,
    type: weaponType,
  };
}
