import { SeededRNG } from '../utils/seeded-rng';
import { Monster, MonsterStats } from './types';

export class MonsterFactory {
  private rng: SeededRNG;

  constructor(seed?: number | string | null) {
    this.rng = new SeededRNG(seed);
  }

  public createMonster(level: number, isBoss: boolean = false): Monster {
    const type = this.selectMonsterType(level, isBoss);
    const stats = this.generateStats(level, isBoss);

    return {
      id: `monster-${Date.now()}-${this.rng.range(1000, 9999)}`,
      name: isBoss ? `Great ${type}` : type,
      type: type,
      level: level,
      stats: stats,
      lootTableId: isBoss ? 'boss_table' : 'standard_table',
      goldReward: {
        min: level * 10,
        max: level * 20
      }
    };
  }

  private selectMonsterType(level: number, isBoss: boolean): string {
    const types = ['Goblin', 'Skeleton', 'Orc', 'Spider', 'Bandit'];
    const bossTypes = ['Dragon', 'Lich', 'Giant', 'Demon'];

    if (isBoss) {
      return this.rng.choice(bossTypes);
    }
    return this.rng.choice(types);
  }

  private generateStats(level: number, isBoss: boolean): MonsterStats {
    const multiplier = isBoss ? 5 : 1;
    const baseHp = 20 + (level * 10);
    const baseAtk = 5 + (level * 2);

    return {
      hp: baseHp * multiplier,
      maxHp: baseHp * multiplier,
      attack: baseAtk * multiplier,
      defense: level * multiplier,
      speed: 10 + level,
      xpReward: level * 100 * multiplier
    };
  }
}
