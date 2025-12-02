import { ItemGenerator } from './ItemGenerator';
import { GenerationContext } from './types';

const generator = new ItemGenerator('test-seed-123');

console.log('--- Generating 5 Items ---');

for (let i = 0; i < 5; i++) {
    const item = generator.generateItem({
        context: 'dungeon_loot' as GenerationContext,
        level: 1,
        seed: `item-${i}`
    });

    console.log(`Item ${i + 1}:`);
    console.log(`  Name: ${item.name}`);
    console.log(`  Rarity: ${item.rarity}`);
    console.log(`  Type: ${item.type} (${item.metadata.attributes.find(a => a.trait_type === 'Type')?.value})`);
    console.log(`  Stats:`, item.stats);
    console.log(`  Metadata:`, JSON.stringify(item.metadata, null, 2));
    console.log('-------------------------');
}
