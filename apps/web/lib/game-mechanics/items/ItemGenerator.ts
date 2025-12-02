import { SeededRNG } from '../utils/seeded-rng';
import {
  GameItem,
  GenerationOptions,
  ItemRarity,
  ItemType,
  GenerationContext,
  PlayerClass,
  EquipmentSlot,
  ItemStats,
  ItemModifier,
} from './types';

export class ItemGenerator {
  private rng: SeededRNG;

  constructor(seed?: number | string | null) {
    this.rng = new SeededRNG(seed);
  }

  /**
   * Rarity distribution (can be modified by rarity modifier) - 4 tiers only
   */
  private getRarityDistribution(rarityModifier = 100): Record<ItemRarity, number> {
    const mod = rarityModifier / 100;
    // Base weights: Common 60, Uncommon 28, Rare 10, Epic 2
    // Legendary is currently 0 in base logic but we can add it later
    return {
      [ItemRarity.COMMON]: Math.max(0, 60 - (mod - 1) * 15),
      [ItemRarity.UNCOMMON]: Math.max(0, 28 + (mod - 1) * 8),
      [ItemRarity.RARE]: Math.max(0, 10 + (mod - 1) * 5),
      [ItemRarity.EPIC]: Math.max(0, 2 + (mod - 1) * 2),
      [ItemRarity.LEGENDARY]: 0, // Placeholder
    };
  }

  /**
   * Determine item rarity based on modifier
   */
  private determineRarity(rarityModifier = 100): ItemRarity {
    const dist = this.getRarityDistribution(rarityModifier);
    const roll = this.rng.random() * 100;
    let cumulative = 0;

    const rarities: ItemRarity[] = [
      ItemRarity.COMMON,
      ItemRarity.UNCOMMON,
      ItemRarity.RARE,
      ItemRarity.EPIC,
    ];

    for (const rarity of rarities) {
      cumulative += dist[rarity];
      if (roll <= cumulative) {
        return rarity;
      }
    }
    return ItemRarity.COMMON;
  }

  /**
   * Generate an item based on options
   */
  public generateItem(options: GenerationOptions): GameItem {
    const {
      context,
      level,
      classPreference = 'any',
      rarityModifier = 100,
      seed,
    } = options;

    // Create new RNG with seed if provided
    if (seed !== undefined && seed !== null) {
      this.rng = new SeededRNG(seed);
    }

    const rarity = this.determineRarity(rarityModifier);
    const category = this.selectCategory(context);

    let itemData: Partial<GameItem> & {
      rawType?: string;
      enhancementNames?: string[];
      baseStats?: ItemStats;
    };

    if (category === ItemType.WEAPON) {
      itemData = this.generateWeapon(rarity, level, classPreference);
    } else {
      itemData = this.generateArmor(rarity, level, classPreference);
    }

    // Construct the final GameItem
    const finalItem: GameItem = {
      id: `item-${Date.now()}-${this.rng.range(1000, 9999)}`,
      name: itemData.name!,
      description: itemData.description!,
      type: category,
      rarity: rarity,
      slot: itemData.slot!,
      levelRequirement: Math.max(1, level - 5), // Simple requirement logic
      classRequirement: itemData.classRequirement,
      stats: itemData.stats || {},
      modifiers: itemData.modifiers || [],
      metadata: {
        seed: this.rng.getSeed().toString(),
        generationDate: new Date().toISOString(),
        attributes: [
          { trait_type: 'Rarity', value: rarity },
          { trait_type: 'Type', value: itemData.rawType || 'Unknown' },
          { trait_type: 'Level', value: level },
          ...(itemData.enhancementNames?.map(e => ({ trait_type: 'Enhancement', value: e })) || [])
        ]
      }
    };

    return finalItem;
  }

  /**
   * Select item category based on context
   */
  private selectCategory(context: GenerationContext): ItemType {
    const contextWeights: Record<GenerationContext, { weapon: number; armor: number }> = {
      dungeon_loot: { weapon: 50, armor: 50 },
      monster_drop: { weapon: 50, armor: 50 },
      boss_drop: { weapon: 50, armor: 50 },
      vendor: { weapon: 50, armor: 50 },
      quest_reward: { weapon: 50, armor: 50 },
    };

    const weights = contextWeights[context] || contextWeights.dungeon_loot;
    const roll = this.rng.random() * 100;

    if (roll <= weights.weapon) {
      return ItemType.WEAPON;
    }
    return ItemType.ARMOR;
  }

  private generateWeapon(
    rarity: ItemRarity,
    level: number,
    classPreference: PlayerClass
  ): Partial<GameItem> & { rawType: string; enhancementNames: string[] } {
    const allWeapons: Record<string, { type: string; damage: number; isMagic: boolean; requiredClass: PlayerClass }> = {
      warrior: { type: 'Longsword', damage: 8, isMagic: false, requiredClass: 'warrior' },
      mage: { type: 'Staff', damage: 6, isMagic: true, requiredClass: 'mage' },
      rogue: { type: 'Dagger', damage: 4, isMagic: false, requiredClass: 'rogue' },
      cleric: { type: 'Mace', damage: 6, isMagic: false, requiredClass: 'cleric' },
    };

    let weaponDef;
    if (classPreference === 'any') {
      const keys = Object.keys(allWeapons);
      const key = this.rng.choice(keys);
      weaponDef = allWeapons[key];
    } else {
      weaponDef = allWeapons[classPreference] || allWeapons['warrior'];
    }

    const rarityStats: Record<ItemRarity, { attackBonus: number; enhancementCount: number }> = {
      [ItemRarity.COMMON]: { attackBonus: 0, enhancementCount: 0 },
      [ItemRarity.UNCOMMON]: { attackBonus: 1, enhancementCount: 0 },
      [ItemRarity.RARE]: { attackBonus: 2, enhancementCount: 1 },
      [ItemRarity.EPIC]: { attackBonus: 3, enhancementCount: 2 },
      [ItemRarity.LEGENDARY]: { attackBonus: 5, enhancementCount: 3 },
    };

    const stats = rarityStats[rarity];
    const levelBonus = Math.floor(level / 5);
    const totalAttackBonus = stats.attackBonus + levelBonus;

    // Calculate base damage (simplified for now, usually dice roll in D&D but we need a number for stats)
    // We'll store the "max" damage or average
    const baseDamage = weaponDef.damage + totalAttackBonus;

    const enhancementNames = this.generateEnhancementNames(stats.enhancementCount);
    const modifiers = this.createModifiersFromEnhancements(enhancementNames);

    const name = this.generateWeaponName(weaponDef.type, rarity, enhancementNames);
    const description = this.generateWeaponDescription(weaponDef.type, rarity, enhancementNames);

    return {
      name,
      description,
      type: ItemType.WEAPON,
      slot: EquipmentSlot.MAIN_HAND, // Simplified
      classRequirement: [weaponDef.requiredClass],
      stats: {
        damage: baseDamage,
        attackSpeed: 1.0, // Default
      },
      modifiers,
      rawType: weaponDef.type,
      enhancementNames
    };
  }

  private generateArmor(
    rarity: ItemRarity,
    level: number,
    classPreference: PlayerClass
  ): Partial<GameItem> & { rawType: string; enhancementNames: string[] } {
    const allArmorKits: Record<string, Array<{ type: string; baseAC: number; armorType: 'Light' | 'Medium' | 'Heavy'; requiredClass: PlayerClass }>> = {
      warrior: [
        { type: 'Full Plate', baseAC: 8, armorType: 'Heavy', requiredClass: 'warrior' },
        { type: 'Chain Mail', baseAC: 6, armorType: 'Medium', requiredClass: 'warrior' },
      ],
      mage: [
        { type: 'Mage Robes', baseAC: 3, armorType: 'Light', requiredClass: 'mage' },
        { type: 'Enchanted Cloak', baseAC: 2, armorType: 'Light', requiredClass: 'mage' },
      ],
      rogue: [
        { type: 'Leather Armor', baseAC: 3, armorType: 'Light', requiredClass: 'rogue' },
        { type: 'Studded Leather', baseAC: 4, armorType: 'Light', requiredClass: 'rogue' },
      ],
      cleric: [
        { type: 'Scale Mail', baseAC: 6, armorType: 'Medium', requiredClass: 'cleric' },
        { type: 'Breastplate', baseAC: 5, armorType: 'Medium', requiredClass: 'cleric' },
      ],
    };

    let candidateArmor;
    if (classPreference === 'any') {
      const all = [
        ...allArmorKits.warrior,
        ...allArmorKits.mage,
        ...allArmorKits.rogue,
        ...allArmorKits.cleric,
      ];
      candidateArmor = this.rng.choice(all);
    } else {
      const options = allArmorKits[classPreference] || allArmorKits['warrior'];
      candidateArmor = this.rng.choice(options);
    }

    const rarityStats: Record<ItemRarity, { acBonus: number; enhancementCount: number }> = {
      [ItemRarity.COMMON]: { acBonus: 0, enhancementCount: 0 },
      [ItemRarity.UNCOMMON]: { acBonus: 1, enhancementCount: 0 },
      [ItemRarity.RARE]: { acBonus: 2, enhancementCount: 1 },
      [ItemRarity.EPIC]: { acBonus: 3, enhancementCount: 2 },
      [ItemRarity.LEGENDARY]: { acBonus: 5, enhancementCount: 3 },
    };

    const stats = rarityStats[rarity];
    const levelBonus = Math.floor(level / 5);
    const totalAcBonus = stats.acBonus + levelBonus;
    const finalAC = candidateArmor.baseAC + totalAcBonus;

    const enhancementNames = this.generateEnhancementNames(stats.enhancementCount);
    const modifiers = this.createModifiersFromEnhancements(enhancementNames);

    const name = this.generateArmorName(candidateArmor.type, rarity, enhancementNames);
    const description = this.generateArmorDescription(candidateArmor.type, rarity, enhancementNames);

    return {
      name,
      description,
      type: ItemType.ARMOR,
      slot: EquipmentSlot.BODY, // Simplified, assuming main body armor
      classRequirement: [candidateArmor.requiredClass],
      stats: {
        defense: finalAC,
      },
      modifiers,
      rawType: candidateArmor.type,
      enhancementNames
    };
  }

  private generateEnhancementNames(count: number): string[] {
    const enhancements: string[] = [];
    const allEnhancements = [
      'Flaming', 'Frost', 'Shock', 'Venomous',
      'Regeneration', 'Lifesteal', 'Fortified', 'Swift',
    ];

    for (let i = 0; i < count; i++) {
      enhancements.push(this.rng.choice(allEnhancements));
    }
    return enhancements;
  }

  private createModifiersFromEnhancements(names: string[]): ItemModifier[] {
    return names.map((name, index) => ({
      id: `mod-${index}-${name.toLowerCase()}`,
      name: name,
      description: `Adds ${name} effect`,
      statChanges: {} // TODO: Map effects to actual stats if needed
    }));
  }

  private generateWeaponName(baseType: string, rarity: ItemRarity, enhancements: string[]): string {
    let name = baseType;
    if (enhancements.length > 0) {
      name = `${enhancements[0]} ${name}`;
    }
    if (rarity !== ItemRarity.COMMON) {
      const rarityPrefixes: Partial<Record<ItemRarity, string>> = {
        [ItemRarity.UNCOMMON]: '+1',
        [ItemRarity.RARE]: '+2',
        [ItemRarity.EPIC]: '+3',
      };
      if (rarityPrefixes[rarity]) {
        name += ` ${rarityPrefixes[rarity]}`;
      }
    }
    return name;
  }

  private generateArmorName(baseType: string, rarity: ItemRarity, enhancements: string[]): string {
    let name = baseType;
    if (enhancements.length > 0) {
      name = `${baseType} of ${enhancements[0]}`;
    }
    if (rarity === ItemRarity.EPIC) {
      const suffixes = ['Protection', 'the Guardian', 'Valor'];
      name = `${name} ${this.rng.choice(suffixes)}`;
    }
    return name;
  }

  private generateWeaponDescription(baseType: string, rarity: ItemRarity, enhancements: string[]): string {
    let desc = `A ${rarity} ${baseType.toLowerCase()}.`;
    if (enhancements.length > 0) {
      desc += ` It glows with ${enhancements[0].toLowerCase()} energy.`;
    }
    return desc;
  }

  private generateArmorDescription(baseType: string, rarity: ItemRarity, enhancements: string[]): string {
    return `A ${rarity} piece of ${baseType.toLowerCase()} that provides excellent protection.`;
  }
}
