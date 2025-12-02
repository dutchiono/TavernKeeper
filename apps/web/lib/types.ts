export enum CharacterClass {
    WARRIOR = 'Warrior',
    MAGE = 'Mage',
    ROGUE = 'Rogue',
    CLERIC = 'Cleric'
}

export enum GameView {
    INN = 'INN',
    MAP = 'MAP',
    BATTLE = 'BATTLE',
    AGENT_DETAIL = 'AGENT_DETAIL',
    CELLAR = 'CELLAR'
}

export interface Stats {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    str: number;
    int: number;
}

export interface Agent {
    id: string;
    name: string;
    class: CharacterClass;
    level: number;
    stats: Stats;
    traits: string[];
    backstory: string;
    currentThought: string;
    inventory: string[];
    spriteColor: string; // Hex code fallback for sprite
    position: { x: number; y: number }; // Percentage 0-100
    lastAction: string;
}

export interface LogEntry {
    id: number;
    message: string;
    type: 'info' | 'combat' | 'dialogue';
    timestamp: string;
}

export interface GameState {
    currentView: GameView;
    party: Agent[];
    selectedAgentId: string | null;
    logs: LogEntry[];
    day: number;
    keepBalance: string; // BigInt as string
}
