import { Monster } from '../monsters/types';
import { GameItem } from '../items/types';

export interface DungeonRoom {
    id: string;
    type: 'combat' | 'treasure' | 'rest' | 'boss' | 'empty';
    monsters: Monster[];
    loot?: GameItem[];
    isCleared: boolean;
}

export interface DungeonLevel {
    levelNumber: number;
    rooms: DungeonRoom[];
    theme: string; // 'crypt', 'cave', 'castle'
    difficultyMultiplier: number;
}

export interface DungeonState {
    id: string;
    currentLevel: number;
    maxLevel: number; // 100
    levels: Record<number, DungeonLevel>; // Cache generated levels

    // Party state within dungeon
    partyId: string;
    currentRoomIndex: number;
    isActive: boolean;

    // Checkpoints
    lastSafeZoneLevel: number;
}
