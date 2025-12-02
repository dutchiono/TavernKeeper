import { SeededRNG } from '../utils/seeded-rng';
import { DungeonLevel, DungeonRoom } from './types';
import { MonsterFactory } from '../monsters/MonsterFactory';

export class DungeonGenerator {
  private rng: SeededRNG;
  private monsterFactory: MonsterFactory;
  private readonly MAX_LEVEL = 100;

  constructor(seed?: number | string | null) {
    this.rng = new SeededRNG(seed);
    this.monsterFactory = new MonsterFactory(seed);
  }

  public generateLevel(levelNumber: number): DungeonLevel {
    if (levelNumber < 1 || levelNumber > this.MAX_LEVEL) {
      throw new Error(`Level ${levelNumber} is out of bounds (1-${this.MAX_LEVEL})`);
    }

    const isBossLevel = levelNumber === 50 || levelNumber === 100;
    const isSafeZone = !isBossLevel && (levelNumber % 10 === 0 || levelNumber === 1);

    const theme = this.determineTheme(levelNumber);
    const rooms = this.generateRooms(levelNumber, isBossLevel, isSafeZone);

    return {
      levelNumber,
      rooms,
      theme,
      difficultyMultiplier: 1 + (levelNumber * 0.1)
    };
  }

  private determineTheme(level: number): string {
    if (level <= 20) return 'Sewers';
    if (level <= 40) return 'Catacombs';
    if (level <= 60) return 'Deep Caves';
    if (level <= 80) return 'Magma Core';
    return 'Void';
  }

  private generateRooms(level: number, isBossLevel: boolean, isSafeZone: boolean): DungeonRoom[] {
    const rooms: DungeonRoom[] = [];

    // For now, we treat a Level as a single "Room" or encounter, 
    // but we can expand this to multiple rooms per level if needed.
    // The user said "each 'level' is a 'room' right?" -> Yes.

    const roomType = isBossLevel ? 'boss' : (isSafeZone ? 'rest' : 'combat');

    const monsters = [];
    if (roomType === 'combat') {
      const monsterCount = this.rng.range(3, 5);
      for (let i = 0; i < monsterCount; i++) {
        monsters.push(this.monsterFactory.createMonster(level, false));
      }
    } else if (roomType === 'boss') {
      monsters.push(this.monsterFactory.createMonster(level, true));
    }

    rooms.push({
      id: `room-${level}-1`,
      type: roomType,
      monsters: monsters,
      isCleared: false
    });

    return rooms;
  }
}
