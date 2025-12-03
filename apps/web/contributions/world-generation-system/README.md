# World Generation System

## What This Does

This contribution provides a comprehensive world generation system that pre-plans and generates a complete game world following a specific hierarchical structure. The system generates world content from the highest cosmic level down to individual mortals and their roles, creating a rich, interconnected world history.

The world is generated in layers:
1. **Primordial Beings** - Fundamental forces (space, time, light, dark, order, chaos)
2. **Cosmic Creators** - Elemental beings (rock, wind, water, life)
3. **Geography** - Continents, oceans, mountain ranges, rivers, underground systems
4. **Conceptual Beings** - Born from mortal worship (luck, love, fertility, justice)
5. **Demi-Gods** - Divine experiments, half-gods, ancient creatures
6. **Mortal Races** - Humans, orcs, goblins, elves, dwarves, creatures
7. **Organizations** - Kingdoms, hordes, towns, tribes, guilds (by magnitude)
8. **Standout Mortals** - Heroes, villains, powerful wizards, kings, war-chiefs, vampires, dungeon bosses
9. **Family and Role** - Individual mortals, their lineages, and their place in history

## Where It Should Be Integrated

### Type Definitions
- `packages/lib/src/types/world-generation.ts` - World generation types and templates
- `packages/lib/src/index.ts` - Export new types

### World Generation System
- `packages/engine/src/world-generation/` - New directory for world generation
  - `world-generator.ts` - Main world generator
  - `primordial-generator.ts` - Generates primordial beings
  - `cosmic-generator.ts` - Generates cosmic creators
  - `geography-generator.ts` - Generates geographical features
  - `conceptual-generator.ts` - Generates conceptual beings
  - `demigod-generator.ts` - Generates demi-gods
  - `mortal-generator.ts` - Generates mortal races and individuals
  - `organization-generator.ts` - Generates organizations
  - `lineage-generator.ts` - Generates family trees and roles

### Integration Points
- `packages/engine/src/world-content/world-manager.ts` - Use world generation when creating content
- `apps/web/workers/worldGeneratorWorker.ts` - Background worker for world generation
- `apps/web/lib/services/worldGenerationService.ts` - Service for world generation
- `apps/web/app/api/world/generate/route.ts` - API endpoint for world generation

### Database Schema
- Extends `world_content` table from world-content-hierarchy
- Adds generation metadata and relationships

## How to Test

### Unit Tests
1. Test each generator level independently
2. Test relationship building between levels
3. Test deterministic generation from seeds
4. Test lineage and role generation

### Integration Tests
1. Generate a complete world from seed
2. Verify all hierarchy levels are created
3. Verify relationships are properly established
4. Test querying generated world content

### Manual Testing
1. Generate a world with a specific seed
2. Query primordial beings and verify cosmic creators
3. Query geography and verify locations
4. Query organizations and verify standout mortals
5. Query lineages and verify family connections

## Dependencies

- Integrates with `world-content-hierarchy` contribution
- Uses existing database connection (Supabase)
- May use AI/LLM for name generation (optional - can use templates)

## Breaking Changes

None - this is an additive feature that extends the world content hierarchy system.

## Design Decisions

1. **Layered Generation**: World is generated top-down, with each layer depending on previous layers
2. **Deterministic**: All generation is seed-based for reproducibility
3. **Template-Based**: Uses templates for names, descriptions, and relationships
4. **Extensible**: Each level can be expanded with new types and templates
5. **Relationship Building**: Automatically creates connections between related elements

## World Structure

```
Primordial Beings (Level 1)
  └── Cosmic Creators (Level 2)
      └── Geography (Level 2.5)
          └── Conceptual Beings (Level 3)
              └── Demi-Gods (Level 4)
                  └── Mortal Races (Level 5)
                      └── Organizations (Level 6)
                          └── Standout Mortals (Level 6.5)
                              └── Family and Role (Level 7)
```

## Code Structure

```
contributions/world-generation-system/
├── README.md (this file)
├── DESIGN.md (design overview)
├── code/
│   ├── types/
│   │   └── world-generation.ts      # Generation types and templates
│   ├── generators/
│   │   ├── world-generator.ts       # Main generator
│   │   ├── primordial-generator.ts  # Level 1
│   │   ├── cosmic-generator.ts      # Level 2
│   │   ├── geography-generator.ts   # Level 2.5
│   │   ├── conceptual-generator.ts  # Level 3
│   │   ├── demigod-generator.ts     # Level 4
│   │   ├── mortal-generator.ts      # Level 5
│   │   ├── organization-generator.ts # Level 6
│   │   └── lineage-generator.ts     # Level 7
│   └── templates/
│       └── world-templates.ts       # Name and description templates
└── examples/
    └── usage-examples.ts             # Generation examples
```

## Integration Example

```typescript
import { WorldGenerator } from '@innkeeper/engine/world-generation';

const generator = new WorldGenerator();

// Generate complete world from seed
const world = await generator.generateWorld({
  seed: 'my-world-seed',
  includeLevels: [1, 2, 2.5, 3, 4, 5, 6, 6.5, 7], // All levels
  depth: 'full', // Generate everything
});

// Query generated content
const primordials = await generator.getPrimordialBeings();
const geography = await generator.getGeography('continent');
const organizations = await generator.getOrganizations('kingdom');
```

## Notes

- World generation can be done incrementally or all at once
- Each level builds upon previous levels
- Relationships are automatically established
- Generated content integrates with world-content-hierarchy system
- World can be regenerated from seed for consistency







