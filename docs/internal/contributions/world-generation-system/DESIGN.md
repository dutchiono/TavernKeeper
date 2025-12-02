# World Generation System - Design Overview

## Problem Statement

The game needs a comprehensive world generation system that creates a rich, interconnected world from cosmic forces down to individual mortals. The world should be generated deterministically from seeds, with each level building upon previous levels to create a coherent world history.

## World Hierarchy

### Level 1: Primordial Beings
**Fundamental forces of the universe**
- Space, Time, Light, Dark, Order, Chaos
- These are the first entities, representing innate properties
- They exist before the world and shape its fundamental nature
- Examples: The Void (Space), The Eternal (Time), The Radiance (Light), The Shadow (Dark)

### Level 2: Cosmic Creators
**Elemental beings that created the world**
- Rock, Wind, Water, Life, Fire, Earth, Air
- Sub-divisions of creation, responsible for shaping the physical world
- Created by or emerged from Primordial Beings
- Examples: The Stone Shaper (Rock), The Wind Rider (Wind), The Deep One (Water), The Life Giver (Life)

### Level 2.5: Geography
**Physical features of the world**
- Continents, Oceans, Mountain Ranges, Rivers, Underground Systems
- Named in the present, but with ancient origins
- Created by Cosmic Creators
- Examples: "The Northern Wastes", "The Endless Sea", "The Dragon's Spine Mountains"

### Level 3: Conceptual Beings
**Born from mortal worship and emotion**
- Luck, Love, Fertility, Justice, War, Death, Wisdom
- Emerged from mortal belief and worship
- Exist because mortals believe in them
- Examples: Lady Fortune (Luck), The Heart's Desire (Love), The Harvest Mother (Fertility)

### Level 4: Demi-Gods
**Divine experiments and ancient beings**
- Half-gods of myth, foulest creatures, ancient entities
- Either experiments mixing divine and mortal, or creatures that have existed for eons
- Bridge between divine and mortal realms
- Examples: The First Vampire, The Dragon King, The Fallen Angel

### Level 5: Mortal Races
**Variety of life**
- Humans, Orcs, Goblins, Elves, Dwarves, Dragons, Beasts
- Created by Cosmic Creators or evolved from Life
- Form the basis of mortal civilization
- Examples: The Human Kingdoms, The Orc Hordes, The Elven Forests

### Level 6: Organizations
**Named groups organized by magnitude**
- Kingdoms, Hordes, Empires (large scale)
- Towns, Tribes, Guilds (medium scale)
- Bands, Clans, Circles (small scale)
- Examples: "The Kingdom of Aetheria", "The Red Orc Horde", "The Mage's Guild"

### Level 6.5: Standout Mortals
**Heroes, villains, and powerful individuals**
- Powerful wizards, kings, war-chiefs, vampires, dungeon bosses
- Those who have risen above the limits of their kin
- Often leaders of organizations or independent forces
- Examples: "Archmage Thalius", "King Aethelred the Bold", "The Lich King"

### Level 7: Family and Role
**Individual mortals and their place in history**
- Family lineages, remembered or written down
- Roles in society: blacksmith, playwright, assassin, princess
- Connections to significant events
- Examples: "The blacksmith who forged the dagger that assassinated King Aethelred"

## Generation Process

### Top-Down Generation

1. **Generate Primordials** (Level 1)
   - Create fundamental forces
   - Establish cosmic order

2. **Generate Cosmic Creators** (Level 2)
   - Create from primordials
   - Assign elemental domains

3. **Generate Geography** (Level 2.5)
   - Create continents, oceans, etc.
   - Name features
   - Link to cosmic creators

4. **Generate Conceptual Beings** (Level 3)
   - Create from mortal concepts
   - Link to mortal worship

5. **Generate Demi-Gods** (Level 4)
   - Create ancient beings
   - Link to primordials/creators

6. **Generate Mortal Races** (Level 5)
   - Create races
   - Place in geography
   - Link to creators

7. **Generate Organizations** (Level 6)
   - Create by magnitude
   - Place in geography
   - Link to races

8. **Generate Standout Mortals** (Level 6.5)
   - Create powerful individuals
   - Link to organizations
   - Create dungeon bosses

9. **Generate Family and Role** (Level 7)
   - Create lineages
   - Assign roles
   - Link to events and items

### Relationship Building

Each level creates relationships with previous levels:
- Organizations are located in Geography
- Standout Mortals belong to Organizations
- Family members are connected to Standout Mortals
- Items are created by Family members
- Events connect all levels

## Generation Templates

### Name Generation
- Use seed-based deterministic name generation
- Templates for each type (primordial names, cosmic names, etc.)
- Cultural naming patterns for organizations

### Description Generation
- Template-based descriptions
- Include relationships to parent levels
- Historical context

### Relationship Templates
- "Created by" relationships
- "Located in" relationships
- "Belongs to" relationships
- "Influenced by" relationships

## Integration with World Content Hierarchy

The generated world integrates with the world-content-hierarchy system:
- Each generated element becomes WorldContent
- Provenance tracks creation relationships
- Lore includes generation context
- Connections link related elements

## Deterministic Generation

All generation is seed-based:
- Same seed = same world
- Can regenerate specific parts
- Can expand world incrementally
- Can query by seed

## Extensibility

The system is designed to be expanded:
- New primordial types
- New cosmic creator elements
- New mortal races
- New organization types
- New role types

## Example Generated World

```
Primordial: The Void (Space), The Eternal (Time)
  └── Cosmic: The Stone Shaper (Rock), The Life Giver (Life)
      └── Geography: "The Northern Wastes" (continent)
          └── Conceptual: Lady Fortune (Luck)
              └── Demi-God: The First Vampire
                  └── Mortal Race: Humans
                      └── Organization: "Kingdom of Aetheria"
                          └── Standout: "King Aethelred the Bold"
                              └── Family: "House Aethelred"
                                  └── Role: "Blacksmith Thorgrim"
                                      └── Item: "The Assassin's Dagger"
```

## Benefits

1. **Rich World**: Complete world from cosmic to individual level
2. **Coherent History**: All elements connected through relationships
3. **Deterministic**: Reproducible world generation
4. **Extensible**: Easy to add new types and templates
5. **Integrated**: Works with world-content-hierarchy system
6. **Queryable**: Can query at any level of detail

