import { DungeonGenerator } from './dungeon/DungeonGenerator';
import { LootManager } from './loot/LootManager';
import { ItemRarity } from './items/types';

const dungeonGen = new DungeonGenerator('sim-seed-1');
const lootManager = new LootManager('sim-seed-1');

console.log('--- STARTING DUNGEON SIMULATION (100 LEVELS) ---');

let totalGold = 0;
let totalItems = 0;
const itemsByRarity: Record<string, number> = {
    [ItemRarity.COMMON]: 0,
    [ItemRarity.UNCOMMON]: 0,
    [ItemRarity.RARE]: 0,
    [ItemRarity.EPIC]: 0,
    [ItemRarity.LEGENDARY]: 0,
};

for (let level = 1; level <= 100; level++) {
    const dungeonLevel = dungeonGen.generateLevel(level);

    // Simulate clearing rooms
    for (const room of dungeonLevel.rooms) {
        if (room.type === 'combat' || room.type === 'boss') {
            const isBoss = room.type === 'boss';

            // Kill monsters
            for (const monster of room.monsters) {
                // Generate loot for each kill
                const loot = lootManager.generateLoot(level, isBoss);
                totalGold += loot.gold;

                for (const item of loot.items) {
                    totalItems++;
                    itemsByRarity[item.rarity]++;

                    if (item.rarity === ItemRarity.EPIC || item.rarity === ItemRarity.LEGENDARY) {
                        console.log(`[Lvl ${level}] FOUND ${item.rarity.toUpperCase()}: ${item.name} (${item.type})`);
                    }
                }
            }
        }
    }
}

console.log('--- SIMULATION COMPLETE ---');
console.log(`Total Gold: ${totalGold.toLocaleString()}`);
console.log(`Total Items: ${totalItems}`);
console.log('Item Distribution:');
Object.entries(itemsByRarity).forEach(([rarity, count]) => {
    const percentage = ((count / totalItems) * 100).toFixed(1);
    console.log(`  ${rarity}: ${count} (${percentage}%)`);
});
