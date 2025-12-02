import { GameItem, ItemRarity } from '../items/types';

export interface LootEntry {
    itemId?: string; // If specific item
    itemType?: string; // If random generation needed
    rarity?: ItemRarity;
    weight: number;
    minQuantity: number;
    maxQuantity: number;
}

export interface LootTable {
    id: string;
    entries: LootEntry[];
    rolls: number; // How many times to roll on this table
}

export interface LootDrop {
    gold: number;
    items: GameItem[];
}
