# Procedural Item Generation System - Design Overview

## Problem Statement

The game needs a procedural item generation system that creates unique, balanced, and thematically appropriate items for various contexts. Items should be generated deterministically from seeds, scale appropriately with game progression, and integrate seamlessly with the existing world generation and loot systems.

**Current Scope (Simplified for Graphical Implementation):**
- Weapons and armor only (no consumables, accessories, or materials)
- 4 rarity tiers (Common, Uncommon, Rare, Epic)
- One weapon per class, two complete armor kits per class
- All items are class-restricted

When new items are needed (dungeon loot, monster drops, vendor stock, quest rewards), the system should:
- Generate items appropriate to the context (dungeon level, monster type, player level)
- Create items with coherent stats and properties
- Integrate with world lore and provenance
- Support weapons and armor with class restrictions
- Maintain balance across rarity tiers
- Provide deterministic generation for reproducibility
- Optionally track item scarcity (availability pools)

## Item Categories

**NOTE: This system has been simplified to focus on weapons and armor only for graphical implementation scope.**

### 1. Weapons (One per Class)

**Current Implementation:**
- **Warrior**: Longsword (1d8 melee, versatile)
- **Mage**: Staff (1d6 magic, two-handed, spell focus)
- **Rogue**: Dagger (1d4 melee, finesse, light)
- **Cleric**: Mace (1d6 melee, standard)

**Weapon Properties:**
- Damage dice configuration (dieCount, die)
- Attack bonus (scales with rarity and level)
- Weapon type (melee/magic)
- Class restrictions (requiredClass property) - **REQUIRED for equipment validation**
- Special properties (finesse, light, two-handed, versatile, spell focus)
- Enhancements (based on rarity: Flaming, Frost, Shock, Venomous, Regeneration, Lifesteal, Fortified, Swift)

### 2. Armor (Two Complete Kits per Class)

**Current Implementation:**

**Warrior:**
- Full Plate (Heavy armor, AC +8 base)
- Chain Mail (Medium armor, AC +6 base)

**Mage:**
- Mage Robes (Light armor, AC +3 base)
- Enchanted Cloak (Light armor, AC +2 base)

**Rogue:**
- Leather Armor (Light armor, AC +3 base)
- Studded Leather (Light armor, AC +4 base)

**Cleric:**
- Scale Mail (Medium armor, AC +6 base)
- Breastplate (Medium armor, AC +5 base)

**Armor Properties:**
- AC bonus (scales with rarity and level)
- Armor type (light/medium/heavy)
- Class restrictions (requiredClass property) - **REQUIRED for equipment validation**
- Special properties (stealth disadvantage for heavy armor)
- Enhancements (based on rarity)

**Important:** Each armor represents a COMPLETE ARMOR SET, not individual pieces.

### 3. Removed Categories (Not in Current Scope)

The following categories were removed to simplify the system for graphical implementation:

- **Accessories & Trinkets** (Rings, Amulets, Cloaks, Belts)
- **Consumables** (Potions, Scrolls, Food)
- **Materials & Crafting Components** (Metals, Organic Materials, Enchanting Materials)
- **Quest/Story Items** (Keys, Artifacts, Documents, Collectibles)

These can be added back in future iterations if needed. The current system focuses on weapons and armor only.

## Rarity System (4 Tiers)

**NOTE: System simplified to 4 tiers. Legendary and Artifact are not implemented.**

### Common
- Basic items with standard stats
- No special properties or enhancements
- Attack bonus: +0, Enhancement count: 0
- Found everywhere (60% at default distribution)
- Example: "Longsword", "Full Plate"

### Uncommon
- Slightly improved stats (+1)
- No enhancements
- Attack bonus: +1, Enhancement count: 0
- Common in early dungeons (28% at default distribution)
- Example: "Longsword +1", "Full Plate +1"

### Rare
- Significant stat improvements (+2)
- One enhancement (Flaming, Frost, Shock, Venomous, Regeneration, Lifesteal, Fortified, Swift)
- Attack bonus: +2, Enhancement count: 1
- Found in mid-tier dungeons (10% at default distribution)
- Example: "Flaming Longsword +2", "Full Plate of Regeneration"

### Epic
- Major stat improvements (+3)
- Multiple enhancements (2 enhancements)
- Attack bonus: +3, Enhancement count: 2
- Found in challenging dungeons (2% at default distribution)
- Example: "Frostbrand Longsword +3", "Full Plate of Protection"

## Generation Contexts

### 1. Dungeon Loot
- Generated when chest is opened
- Based on dungeon level and room type
- 50% weapons, 50% armor
- Rarity distribution: 60% common, 28% uncommon, 10% rare, 2% epic

### 2. Monster Drops
- Drop weapons or armor
- Type-appropriate to monster
- 50% weapons, 50% armor
- Rarity distribution: 60% common, 28% uncommon, 10% rare, 2% epic

### 3. Boss Drops
- Always drop items
- Guaranteed rare+ (weighted toward epic)
- Themed to boss
- 50% weapons, 50% armor
- Rarity distribution: 20% rare, 80% epic

### 4. Vendor Stock
- Common and uncommon items primarily
- 50% weapons, 50% armor
- Rotating stock based on seed

### 5. Quest Rewards
- Uncommon to epic items
- Themed to quest
- 50% weapons, 50% armor
- Rarity based on quest importance

### 6. World Generation Items

**Procedural Items:**
- Generated from world generation system
- Linked to family members, blacksmiths, etc.
- Have full provenance and lore
- Deterministic from world seed

## Generation Process

### 1. Context Analysis

Determine generation parameters:
- **Level**: Dungeon level, player level, or challenge rating
- **Context**: Source (dungeon, monster, vendor, quest)
- **Type Requirements**: Any restrictions (weapon type, armor slot, etc.)
- **Rarity Target**: Desired rarity tier
- **Theme**: Thematic constraints (fire dungeon, undead, etc.)

### 2. Rarity Determination

Roll for rarity based on context:
- Use seeded RNG for deterministic results
- Adjust distribution based on context
- Apply rarity modifiers (luck, difficulty, etc.)

### 3. Category Selection

Select item category:
- **Weapons**: 50% chance (one weapon per class)
- **Armor**: 50% chance (two armor kits per class)
- **Note**: Consumables, accessories, and materials are not in current scope

### 4. Base Item Generation

Generate base item:
- Select base type (e.g., "Longsword", "Leather Armor")
- Determine base stats from tier tables
- Apply level scaling

### 5. Stat Generation

Generate item stats:
- **Weapons**: Damage dice, attack bonus, special properties
- **Armor**: AC bonus, armor type, special properties

### 6. Enhancement Generation

Add enhancements based on rarity:
- **Common**: No enhancements
- **Uncommon**: No enhancements (stat bonus only)
- **Rare**: One enhancement (Flaming, Frost, Shock, Venomous, Regeneration, Lifesteal, Fortified, Swift)
- **Epic**: Two enhancements

### 7. Name Generation

Generate item name:
- Use templates based on item type
- Include enhancements in name
- Consider world lore and provenance
- Ensure uniqueness within context

### 8. Description Generation

Generate item description:
- Base description from type
- Enhancement descriptions
- Lore integration (if applicable)
- Historical context (if from world generation)

### 9. Property Generation

Generate special properties:
- **Damage Types**: Fire, frost, lightning, poison, etc.
- **Resistances**: Elemental, physical, magical
- **Stat Bonuses**: Any stat (STR, DEX, etc.)
- **Special Abilities**: Regeneration, lifesteal, cleave, etc.
- **Class Restrictions**: Specific class or all classes

### 10. World Integration

Integrate with world content:
- Link to world generation (if applicable)
- Create provenance chain
- Generate lore entry
- Link to related world content

## Generation Templates

### Weapon Templates

**Melee Weapon:**
```
Base: {type} (Shortsword, Longsword, etc.)
Damage: {dieCount}d{die} + {bonus}
Type: {damageType}
Properties: {properties}
Enhancements: {enhancements}
```

**Ranged Weapon:**
```
Base: {type} (Shortbow, Crossbow, etc.)
Damage: {dieCount}d{die} + {bonus}
Range: {short}/{long}
Properties: {properties}
Enhancements: {enhancements}
```

**Magic Weapon:**
```
Base: {type} (Wand, Staff, etc.)
Spell Power: +{bonus}
Charges: {charges} (if applicable)
Properties: {properties}
Enhancements: {enhancements}
```

### Armor Templates

**Armor:**
```
Base: {type} (Leather, Chain Mail, etc.)
AC: +{bonus}
Type: {light/medium/heavy}
Max DEX: {modifier}
Properties: {properties}
Enhancements: {enhancements}
```

**Shield:**
```
Base: {type} (Light Shield, Heavy Shield, etc.)
AC: +{bonus}
Properties: {properties}
Enhancements: {enhancements}
```

### Enhancement Templates

**Elemental:**
- Flaming: +1d4 fire damage
- Frost: +1d4 cold damage
- Shock: +1d4 lightning damage
- Venomous: +1d4 poison damage

**Stat Bonuses:**
- +{1-5} to {STR/DEX/CON/INT/WIS/CHA}
- Stacking rules apply

**Resistances:**
- Resistance to {damage type}
- Immunity to {condition}

**Special Abilities:**
- Regeneration: +{amount} HP per turn
- Lifesteal: Heal for {percentage} of damage dealt
- Cleave: Attack multiple enemies
- Spell Focus: +{bonus} to spell attack/damage

## Deterministic Generation

All item generation is seed-based:

### Seed Sources
- **Dungeon Seed**: For dungeon loot
- **Monster Seed**: Monster type + instance ID
- **Vendor Seed**: Vendor location + time
- **Quest Seed**: Quest ID
- **World Seed**: For world-generated items

### Generation Formula
```
itemSeed = HMAC_SHA256(contextSeed + itemIndex + timestamp)
```

Same seed + same context = same item

### Deterministic Properties
- Base type
- Stats
- Enhancements
- Name
- Description
- Rarity

## Power Scaling

### Level-Based Scaling

**Weapons:**
- Damage dice scale with level
- Attack bonus increases (base + floor(level / 5))
- Special abilities unlock based on rarity

**Armor:**
- AC bonus increases (base + floor(level / 5))
- Armor type determines base AC
- Enhancements unlock based on rarity

### Scaling Formulas

**Weapon Damage:**
```
Base Damage = tierBaseDamage + (level * levelMultiplier)
```

**Armor AC:**
```
AC Bonus = tierBaseAC + floor(level / 3)
```

**Note:** Stat bonuses are not currently implemented as separate properties. Items gain attack bonus (weapons) or AC bonus (armor) that scales with rarity and level.

## Balance Considerations

### Rarity Distribution (4 Tiers)
- **Common**: 60% of drops (at default 100% modifier)
- **Uncommon**: 28% of drops
- **Rare**: 10% of drops
- **Epic**: 2% of drops

### Power Budget
- Each rarity tier has a power budget
- Stat bonuses and special abilities cost budget points
- Balance ensures progression feels meaningful

### Class Balance
- Items available for all classes
- No single class dominates
- Class-specific items enhance class fantasy

## Integration Points

### With World Generation System
- Items can be generated by family members (blacksmiths, etc.)
- Items inherit world lore and provenance
- Items linked to world content hierarchy

### With World Content Hierarchy
- Items become WorldContent entries
- Provenance tracks creation and ownership
- Lore includes generation context
- Connections to related world elements

### With Combat System
- Weapon stats integrate with combat calculations
- Armor AC affects combat resolution
- Note: Consumables and accessories are not in current scope

### With Loot Claim System
- Generated items become LootItems
- Items minted as ERC-1155 tokens
- Properties stored in item data

### With Inventory System
- Items stored in entity inventory
- Equipment slots for equippable items
- Stat modifications from equipped items

### With Marketplace
- Items can be listed for sale
- Properties determine market value
- Rarity affects pricing

## Example Generated Items

### Example 1: Common Weapon
```
Name: Longsword
Type: Weapon (Melee)
Rarity: Common
Required Class: warrior
Damage: 1d8 + 0
Attack Bonus: +0
Properties: Versatile
Enhancements: None
Description: A common longsword. Nothing special, but reliable.
```

### Example 2: Rare Weapon
```
Name: Frostbrand Staff +2
Type: Weapon (Magic)
Rarity: Rare
Required Class: mage
Damage: 1d6 + 2
Attack Bonus: +2
Properties: Spell Focus, Two-handed
Enhancements: Frost
Description: A rare staff. It glows with frost energy.
```

### Example 3: Epic Armor
```
Name: Full Plate of Protection
Type: Armor
Rarity: Epic
Required Class: warrior
AC: +11
Properties: Heavy Armor, Stealth Disadvantage
Enhancements: Fortified, Regeneration
Description: An epic piece of full plate that provides excellent protection.
```

### Example 4: Uncommon Armor
```
Name: Mage Robes +1
Type: Armor
Rarity: Uncommon
Required Class: mage
AC: +4
Properties: Light Armor
Enhancements: None
Description: An uncommon piece of mage robes that provides excellent protection.
```

## Benefits

1. **Infinite Variety**: Procedural generation creates endless unique items
2. **Deterministic**: Same seed produces same items for reproducibility
3. **Contextual**: Items appropriate to their source and level
4. **Balanced**: Rarity tiers ensure meaningful progression
5. **Integrated**: Works seamlessly with world generation and lore
6. **Extensible**: Easy to add new item types, properties, and enhancements
7. **Scalable**: Power scales appropriately with game progression

## Scarcity System (Optional Feature)

### Overview

**STATUS: OPTIONAL** - This feature can be easily removed if not desired.

The scarcity system adds a layer on top of rarity distribution that accounts for the current existence of items in the world. Each item type has a pool of 100 available items. As items are generated, the pool depletes, making that item type increasingly rare.

### How It Works

1. **Item Type Tracking**: Each item type (Longsword, Staff, Dagger, Mace, Full Plate, Chain Mail, etc.) has a counter capped at 100
2. **Availability Weighting**: When selecting items, weights are calculated as: `weight = 100 - current_count`
3. **Weighted Selection**: Items with more availability have higher weights and are more likely to be selected
4. **Depletion Effect**: As items approach the cap (e.g., 99 Staves exist), their weight becomes very low (weight = 1), making them extremely rare

### Example

If 99 Staves have been generated:
- Staff weight = 1 (only 1 left available)
- Longsword weight = 100 (all 100 available)
- Dagger weight = 100 (all 100 available)
- Mace weight = 100 (all 100 available)

Result: Staff has a 1/301 chance (0.33%), while others have 100/301 chance (33.2% each).

### Implementation Details

- **Storage**: Counts are stored persistently (localStorage in HTML tool, database in production)
- **Weight Calculation**: `getAvailabilityWeight(itemType)` returns `max(0, 100 - current_count)`
- **Selection**: Weighted random selection based on availability weights
- **Increment**: After each item generation, the counter for that item type is incremented

### To Remove This Feature

If the scarcity system is not desired, it can be easily removed:

1. **Remove Scarcity Methods** (in `ItemGenerator` class):
   - `getItemCounts()`
   - `saveItemCounts()`
   - `incrementItemCount()`
   - `getAvailabilityWeight()`
   - `resetItemCounts()`

2. **Remove Weighted Selection Logic**:
   - In `generateWeapon()`: Replace weighted selection with simple random choice
   - In `generateArmor()`: Replace weighted selection with simple random choice

3. **Remove Counter Increment**:
   - Remove the `incrementItemCount()` call in `generateItem()`

4. **Remove UI Elements** (if applicable):
   - Remove "Reset Counts" and "Show Counts" buttons

5. **Search for "SCARCITY"** in the codebase to find all related code blocks

### Code Markers

All scarcity-related code is marked with:
- `// SCARCITY SYSTEM:` - Start of scarcity code block
- `// END SCARCITY SYSTEM` - End of scarcity code block
- `// TO REMOVE:` - Instructions for removal

Search for "SCARCITY" in the code to find all related sections.

## Future Enhancements

- **Crafting System**: Combine materials to create items
- **Enchanting System**: Enhance existing items with enchantments
- **Set Items**: Items that grant bonuses when worn together
- **Dynamic Properties**: Properties that evolve with use
- **Item Fusion**: Combine items to create new ones
- **AI-Generated Descriptions**: Use LLM for richer item descriptions
- **Player Feedback**: Learn from player preferences to generate better items
- **Seasonal Items**: Time-limited special items
- **Item Evolution**: Items that level up with the player
- **Customization**: Allow players to name/enhance items

## Implementation Considerations

### Performance
- Cache generation templates
- Pre-generate common items
- Lazy load item properties

### Storage
- Store generated items in database
- Cache frequently accessed items
- Archive old items

### Testing
- Unit tests for generation logic
- Balance tests for rarity distributions
- Integration tests with combat system

### Extensibility
- Plugin system for custom item types
- Template system for easy additions
- Configuration files for balance tweaks

