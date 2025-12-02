import { SeededRNG } from '../utils/seeded-rng';
import { ItemGenerator } from '../items/ItemGenerator';
import { GameItem, ItemRarity, GenerationContext } from '../items/types';
import { LootDrop } from './types';

export class LootManager {
    private rng: SeededRNG;
    private itemGenerator: ItemGenerator;

    constructor(seed?: number | string | null) {
        this.rng = new SeededRNG(seed);
        this.itemGenerator = new ItemGenerator(seed);
    }

    public generateLoot(level: number, isBoss: boolean = false): LootDrop {
        const gold = this.calculateGold(level, isBoss);
        const items = this.rollForItems(level, isBoss);

        return {
            gold,
            items
        };
    }

    private calculateGold(level: number, isBoss: boolean): number {
        const base = this.rng.range(10, 20);
        const multiplier = isBoss ? 10 : 1;
        return base * level * multiplier;
    }

    private rollForItems(level: number, isBoss: boolean): GameItem[] {
        const items: GameItem[] = [];

        // Drop chance: 10% for normal, 100% for boss
        const dropChance = isBoss ? 100 : 10;

        if (this.rng.random() * 100 <= dropChance) {
            // Determine how many items
            const count = isBoss ? this.rng.range(1, 3) : 1;

            for (let i = 0; i < count; i++) {
                // Determine rarity modifier based on level and boss status
                // Base 100. Boss adds +50. Level adds +1 per level (capped at +100)
                let rarityMod = 100;
                if (isBoss) rarityMod += 50;
                rarityMod += Math.min(100, level);

                const context: GenerationContext = isBoss ? 'boss_drop' : 'monster_drop';

                items.push(this.itemGenerator.generateItem({
                    context,
                    level,
                    rarityModifier: rarityMod,
                    seed: `loot-${level}-${this.rng.range(1, 100000)}`
                }));
            }
        }

        return items;
    }
}
