# Item Generator Test Tool

A standalone HTML tool for testing the procedural item generation system.

## Usage

Simply open `item-generator-tool.html` in your web browser. No build process or dependencies required.

## Features

### Controls

1. **Number of Items**: Specify how many items to generate (1-100)
2. **Generation Context**: Choose the context for item generation
   - Dungeon Loot
   - Monster Drop
   - Boss Drop
   - Vendor Stock
   - Quest Reward
3. **Level**: Adjust the level slider (1-20) to affect item scaling
4. **Class Preference**: Select a class preference or "Any"
   - Warrior
   - Mage
   - Rogue
   - Cleric
   - Any
5. **Rarity Modifier**: Adjust the rarity modifier slider (0-200%)
   - Lower values = more common items
   - Higher values = more rare items
   - 100% = default distribution
6. **Seed**: Enter a seed for deterministic generation
   - Leave empty for random generation
   - Use the same seed to get the same results
   - Click "Random" to generate a random seed

### Results Display

After clicking "Generate Items", you'll see:

- **Stats Summary**: Count of items by rarity
- **Item Cards**: Each generated item displayed as a card showing:
  - Name (with rarity coloring)
  - Type
  - Stats (damage, AC, effects, etc.)
  - Properties and enhancements
  - Description

Items are color-coded by rarity:
- **Common** (Gray)
- **Uncommon** (Green)
- **Rare** (Blue)
- **Epic** (Purple)

## Testing Tips

1. **Test Rarity Distribution**: Generate 100 items with default settings to see if the distribution matches expectations
2. **Test Determinism**: Use the same seed multiple times - you should get identical results
3. **Test Context**: Try different contexts to see how they affect item types and distributions
4. **Test Level Scaling**: Adjust the level slider to see how item stats scale
5. **Test Rarity Modifier**: Adjust the rarity modifier to see how it affects the distribution

## Notes

- This is a simplified implementation for testing purposes
- Only generates weapons and armor (no consumables or accessories)
- 4 rarity tiers: Common, Uncommon, Rare, Epic
- One weapon per class, two armor kits per class
- All items have class restrictions (requiredClass property)
- Optional scarcity system tracks item availability (capped at 100 per type)
- All generation is deterministic when using seeds
- The tool uses a simple seeded RNG (Mulberry32) for reproducibility
- Scarcity counts persist in localStorage (reset with "Reset All Counts" button)

