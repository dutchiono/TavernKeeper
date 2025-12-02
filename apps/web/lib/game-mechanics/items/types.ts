export enum ItemRarity {
    COMMON = 'common',
    UNCOMMON = 'uncommon',
    RARE = 'rare',
    EPIC = 'epic',
    LEGENDARY = 'legendary',
}

export enum ItemType {
    WEAPON = 'weapon',
    ARMOR = 'armor',
}

export enum EquipmentSlot {
    MAIN_HAND = 'main_hand',
    OFF_HAND = 'off_hand',
    HEAD = 'head',
    BODY = 'body',
    HANDS = 'hands',
    FEET = 'feet',
}

export type PlayerClass = 'warrior' | 'mage' | 'rogue' | 'cleric' | 'any';
export type GenerationContext = 'dungeon_loot' | 'monster_drop' | 'boss_drop' | 'vendor' | 'quest_reward';

export interface ItemStats {
    damage?: number; // For weapons
    defense?: number; // For armor
    attackSpeed?: number;
    critChance?: number;
    durability?: number;
}

export interface ItemModifier {
    id: string;
    name: string;
    description: string;
    statChanges: Partial<ItemStats>;
}

export interface GameItem {
    id: string;
    name: string;
    description: string;
    type: ItemType;
    rarity: ItemRarity;
    slot: EquipmentSlot;
    levelRequirement: number;
    classRequirement?: PlayerClass[]; // 'warrior', 'mage', etc.
    stats: ItemStats;
    modifiers: ItemModifier[];

    // Metadata for NFT generation
    metadata: {
        seed: string;
        generationDate: string;
        imageUrl?: string;
        attributes: Array<{ trait_type: string; value: string | number }>;
    };
}

export interface GenerationOptions {
    context: GenerationContext;
    level: number;
    classPreference?: PlayerClass;
    rarityModifier?: number; // 0-200, default 100
    seed?: number | string | null;
}
