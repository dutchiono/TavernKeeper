# World Content Hierarchy - Design Overview

## Problem Statement

The game needs a persistent world that provides context and meaning to game elements. When characters clear a dungeon, defeat a boss, or obtain unique gear, players and agents should be able to ask "where did this come from?" and get rich, contextual answers.

Most game activity is routine, but when something important happens, the world needs to have depth and history to make that importance meaningful. The system should continuously build a world lore database that grows over time.

## Solution Design

### Hierarchical World Structure

The world is organized in a strict hierarchy:

```
World
├── Regions (geographical areas)
│   ├── Locations (cities, ruins, landmarks)
│   │   ├── Dungeons (adventure sites)
│   │   │   ├── Rooms (dungeon sections)
│   │   │   │   ├── Encounters (bosses, events)
│   │   │   │   │   └── Loot (items found)
```

Each level has:
- **Identity**: Name, description, type
- **Provenance**: Origin, creator, history
- **Lore**: Story, significance, connections
- **Relationships**: Parent/child, related elements

### Provenance Tracking

Every element tracks its provenance chain:

**For a Dungeon:**
- **Location**: What region/location is it in?
- **Builder**: What civilization/entity built it?
- **Purpose**: Why was it built?
- **Age**: How old is it?
- **History**: What events have occurred here?

**For an Item:**
- **Material**: What is it made of?
- **Creator**: Who made it?
- **Age**: How old is it?
- **Previous Owners**: Who has owned it?
- **Origin**: Where did the materials come from?
- **Significance**: Why is it important?

**For a Boss:**
- **Origin**: Where did it come from?
- **Motivation**: What are its goals?
- **History**: What events shaped it?
- **Connections**: What other entities/places is it connected to?

### Lore Generation

Lore is generated using a combination of:

1. **Deterministic Templates**: Based on seeds, element types, and relationships
2. **Contextual Information**: Derived from game state and events
3. **Connection Building**: Automatically links related elements
4. **Progressive Enrichment**: Lore grows richer as more events occur

### World Content Lifecycle

1. **Creation**: When a new element is created (dungeon generated, item found, boss encountered)
   - Generate basic world content
   - Establish provenance
   - Create initial lore

2. **Enrichment**: As events occur
   - Update history
   - Add connections
   - Expand lore

3. **Querying**: When agents/players need context
   - Retrieve world content
   - Follow provenance chains
   - Get related elements

### Key Features

1. **Automatic Generation**: World content is generated automatically when elements are created
2. **Provenance Chains**: Every element knows its origin and history
3. **Connection Building**: Elements are automatically linked based on relationships
4. **Persistent Storage**: World content is stored permanently and grows over time
5. **Query Interface**: Rich querying for lore, provenance, and connections
6. **Agent Integration**: Agents can access world lore to inform decisions

### Data Model

#### WorldContent (Base)
- `id`: Unique identifier
- `type`: Element type (region, location, dungeon, item, boss, etc.)
- `name`: Element name
- `description`: Basic description
- `parentId`: Parent element in hierarchy
- `createdAt`: When this element was created in the world
- `metadata`: Additional type-specific data

#### Provenance
- `originId`: What element/entity created this
- `creatorId`: Specific creator entity
- `creationMethod`: How it was created (built, forged, born, etc.)
- `creationTime`: When it was created (in-world time)
- `history`: Array of significant events
- `age`: Calculated age

#### Lore
- `story`: Narrative description
- `significance`: Why this element matters
- `connections`: Related elements
- `culturalContext`: Cultural/historical context
- `enrichedAt`: When lore was last enriched

### Integration with Game Systems

#### With Logging System
- World content is created/updated when key events occur
- Event logs reference world content IDs
- Lore generation uses event history

#### With Game Engine
- Dungeons generate world content on creation
- Items generate world content on discovery
- Bosses generate world content on encounter
- Events update world content history

#### With Agent System
- Agents can query world lore
- Agents reference world content in conversations
- World content informs agent decision-making

### Example Scenarios

#### Scenario 1: Dungeon Clear
1. Party clears "Ancient Dwarven Mine"
2. System generates world content:
   - Location: "Northern Mountain Range"
   - Builder: "Ancient Dwarven Kingdom"
   - Purpose: "Iron mining operation"
   - Age: "500 years old"
   - History: "Abandoned after goblin invasion"
3. Lore: "Built by the Ancient Dwarven Kingdom 500 years ago as a major iron mining operation. The mine was abandoned after a devastating goblin invasion that wiped out the mining colony. The goblins have since made it their home."
4. Connections: Links to other Dwarven structures, goblin tribes, iron deposits

#### Scenario 2: Unique Item Found
1. Party finds "Dwarven Warhammer of the Forge"
2. System generates world content:
   - Material: "Mithril and Iron"
   - Creator: "Master Dwarf Smith Thorgrim"
   - Age: "450 years old"
   - Origin: "Forged in the Ancient Dwarven Mine"
   - Previous Owners: "Thorgrim → Dwarven Warrior → (lost) → Party"
3. Lore: "Forged by Master Dwarf Smith Thorgrim 450 years ago in the Ancient Dwarven Mine. This warhammer was the personal weapon of a legendary Dwarven warrior who defended the mine during the goblin invasion. It was lost when the warrior fell in battle."
4. Connections: Links to Ancient Dwarven Mine, Thorgrim, Dwarven warrior, goblin invasion

#### Scenario 3: Boss Defeat
1. Party defeats "Goblin Chieftain Grubnak"
2. System generates world content:
   - Origin: "Born in the Ancient Dwarven Mine"
   - Motivation: "Expand goblin territory"
   - History: "Led the invasion that claimed the mine"
   - Connections: "Ancient Dwarven Mine, Goblin Tribe"
3. Lore: "Grubnak was born in the Ancient Dwarven Mine after his tribe claimed it. He rose to power by leading successful raids and expanding goblin territory. His defeat marks a significant shift in the region's power balance."
4. Connections: Links to Ancient Dwarven Mine, goblin tribe, regional power dynamics

### Benefits

1. **World Depth**: Every element has history and context
2. **Narrative Coherence**: Elements connect to form a coherent world
3. **Agent Context**: Agents can reference rich world lore
4. **Player Engagement**: Players can explore world history
5. **Progressive Building**: World grows richer over time
6. **Deterministic**: World content can be regenerated from seeds

### Future Enhancements

- AI-generated lore (optional, can use templates)
- Dynamic world events that update world content
- Player-contributed lore
- World content visualization
- Historical timeline generation
- Cultural system integration







