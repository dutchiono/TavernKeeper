import { GameItem } from '../items/types';

export interface MonsterStats {
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    xpReward: number;
}

export interface Monster {
    id: string;
    name: string;
    type: string; // 'goblin', 'skeleton', etc.
    level: number;
    stats: MonsterStats;

    // Loot
    lootTableId: string;
    guaranteedDrops?: GameItem[]; // For bosses
    goldReward: {
        min: number;
        max: number;
    };
}

export interface MonsterSpawnConfig {
    monsterId: string;
    minLevel: number;
    maxLevel: number;
    weight: number; // Spawn probability weight
    isBoss?: boolean;
}
