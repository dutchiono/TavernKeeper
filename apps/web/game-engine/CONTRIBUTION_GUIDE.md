# Contribution Guide for InnKeeper

This guide provides a comprehensive overview of the InnKeeper game structure, coding conventions, and how to structure your contributions for seamless integration.

## Game Overview

**InnKeeper** is a Next.js-based dungeon crawler game featuring:
- **AI-Driven Characters**: ElizaOS agents that make decisions and interact
- **Deterministic Game Engine**: Seeded PRNG for reproducible runs
- **8-bit Pixel Art Aesthetic**: NES/SNES-era visual style with PixiJS rendering
- **Farcaster Integration**: Miniapp support for social interactions
- **Blockchain Integration**: Smart contracts for NFTs, tokens, and inventory (ERC-721, ERC-20, ERC-1155, ERC-6551)

### Core Gameplay Loop

1. Players manage a party of AI agents in an inn/hub
2. Agents can be conversed with, equipped, and given personality traits
3. Players send parties into dungeons
4. Agents autonomously make decisions during dungeon runs
5. Runs are deterministic and reproducible (seeded RNG)
6. Results feed back into agent memory and character progression

## Technology Stack

### Programming Languages

**Primary: TypeScript**
- All new code must be written in TypeScript
- Strict mode enabled (`"strict": true` in tsconfig.json)
- Target: ES2022 for packages, ES2020 for contracts
- Use modern TypeScript features (interfaces, types, enums, async/await)

**Secondary: Solidity**
- Smart contracts in `packages/contracts/`
- Uses Hardhat for development and testing
- Follows OpenZeppelin patterns for upgradeable contracts

### Frontend Stack

- **Framework**: Next.js 16+ (App Router)
- **React**: 19+ with Server & Client Components
- **Rendering**: PixiJS 7+ for 8-bit canvas scenes
- **Styling**: Tailwind CSS with pixel-perfect fonts
- **State Management**: Zustand for client state
- **Data Fetching**: TanStack React Query
- **Blockchain**: Wagmi + Viem for Web3 interactions

### Backend Stack

- **API**: Next.js Route Handlers (`/app/api/*`)
- **Queue System**: BullMQ with Redis (ioredis)
- **Database**: PostgreSQL via Supabase
- **Workers**: TypeScript workers using `tsx` for execution
- **Agents**: ElizaOS integration (microservice or integrated)

### Game Engine

- **Location**: `packages/engine/`
- **Language**: TypeScript
- **RNG**: Seeded PRNG (seedrandom or mulberry32/xoshiro)
- **Determinism**: All runs are reproducible with the same seed
- **Testing**: Vitest for unit tests

## Project Structure

```
innkeeper/
├── apps/
│   └── web/                    # Next.js application
│       ├── app/                # App Router pages & API routes
│       ├── components/         # React components
│       ├── lib/                # Utilities, services, contracts
│       ├── workers/            # BullMQ workers
│       └── e2e/                # Playwright E2E tests
│
├── packages/
│   ├── engine/                 # Game engine (deterministic)
│   ├── agents/                 # ElizaOS agent wrappers
│   ├── lib/                    # Shared TypeScript types & utils
│   └── contracts/              # Solidity smart contracts
│
├── supabase/
│   └── migrations/             # Database schema migrations
│
└── game-engine/              # Your contributions go here
```

## Coding Conventions

### TypeScript Style

1. **Type Definitions**
   - Use `interface` for object shapes
   - Use `type` for unions, intersections, and aliases
   - Export types from `packages/lib/src/types/` for shared types
   - Use enums for fixed sets of values

   ```typescript
   // Good
   export interface Entity {
     id: string;
     name: string;
     stats: EntityStats;
   }

   export type GameEvent = CombatEvent | ExplorationEvent | SystemEvent;

   export enum CharacterClass {
     WARRIOR = 'Warrior',
     MAGE = 'Mage',
   }
   ```

2. **Function Patterns**
   - Use named exports for functions
   - Add JSDoc comments for public functions
   - Use explicit return types for complex functions
   - Prefer `async/await` over promises

   ```typescript
   /**
    * Calculate attack roll: d20 + attack bonus
    */
   export function attackRoll(
     attacker: Entity,
     rng: RNG,
     advantage = false
   ): number {
     // Implementation
   }
   ```

3. **Imports**
   - Use workspace imports: `@innkeeper/engine`, `@innkeeper/lib`
   - Group imports: types first, then modules
   - Use type-only imports when appropriate: `import type { Entity } from ...`

   ```typescript
   import type { Entity, GameEvent } from '@innkeeper/lib';
   import { makeRng, d } from './rng';
   import { attack } from './combat';
   ```

4. **Naming Conventions**
   - **PascalCase**: Classes, interfaces, types, enums, React components
   - **camelCase**: Variables, functions, methods
   - **UPPER_SNAKE_CASE**: Constants
   - **kebab-case**: File names (except React components: PascalCase.tsx)

5. **Error Handling**
   - Throw errors with descriptive messages
   - Use custom error classes for specific error types
   - Validate inputs at function boundaries

### React/Next.js Patterns

1. **Component Structure**
   - Use Server Components by default
   - Mark Client Components with `'use client'` directive
   - Keep heavy logic in packages, not components

   ```typescript
   // Server Component (default)
   export default function Page() {
     // Server-side logic
   }

   // Client Component
   'use client'
   export default function PixiScene() {
     // Client-side logic with hooks
   }
   ```

2. **File Organization**
   - One component per file
   - Co-locate related components in folders
   - Use index files for clean imports

3. **State Management**
   - Use Zustand for global client state
   - Use React Query for server state
   - Prefer server state over client state when possible

### Game Engine Patterns

1. **Deterministic RNG**
   - Always use seeded RNG from `packages/engine/src/rng.ts`
   - Never use `Math.random()` directly
   - Seed format: `HMAC_SHA256(dungeonSeed + runId + startTime)`

   ```typescript
   import { makeRng, d } from './rng';

   const rng = makeRng(seed);
   const roll = d(20, rng); // d20 roll
   ```

2. **Action DSL**
   - Agents propose actions, engine executes them
   - Actions are validated before execution
   - All actions produce structured events

3. **Event System**
   - Events are typed: `CombatEvent | ExplorationEvent | SystemEvent | ...`
   - Events are immutable and logged
   - Events feed back into agent memory

### Database Patterns

1. **Schema**
   - Defined in `supabase/migrations/`
   - Use JSONB for flexible data (agent memory, inventory)
   - Follow existing table patterns

2. **Queries**
   - Use Supabase client from `apps/web/lib/supabase.ts`
   - Type responses with TypeScript interfaces
   - Handle errors gracefully

## Integration Points

### Where Your Code Should Go

1. **Game Mechanics & Balance**
   - `packages/engine/src/` - Core game logic
   - `packages/lib/src/types/` - New types/interfaces
   - Follow existing patterns in `combat.ts`, `spatial.ts`, `objectives.ts`

2. **Frontend Features**
   - `apps/web/app/` - New pages/routes
   - `apps/web/components/` - React components
   - `apps/web/lib/` - Utilities and services

3. **Agent Behavior**
   - `packages/agents/src/` - Agent wrappers and plugins
   - `packages/agents/src/plugins/` - Custom agent plugins

4. **Smart Contracts**
   - `packages/contracts/contracts/` - Solidity contracts
   - Follow upgradeable proxy patterns (UUPS)
   - Use OpenZeppelin libraries

5. **Database Changes**
   - `supabase/migrations/` - New migration files
   - Follow naming: `YYYYMMDDHHMMSS_description.sql`

## Contribution Structure

When adding a contribution, create a folder in `game-engine/` with:

```
game-engine/
└── feature-name/
    ├── README.md              # Documentation (use CONTRIBUTION_TEMPLATE.md)
    ├── code/                  # Your code files (if applicable)
    │   ├── engine/            # Engine changes
    │   ├── frontend/          # Frontend changes
    │   └── types/             # Type definitions
    └── examples/              # Example usage or test cases
```

### Documentation Requirements

Each contribution must include:

1. **What it does** - Clear description
2. **Where it integrates** - Specific file paths and locations
3. **How to test** - Step-by-step testing instructions
4. **Dependencies** - New packages, env vars, services
5. **Breaking changes** - Any considerations
6. **Code examples** - Usage snippets

## Testing Requirements

- **Unit Tests**: Vitest (in package `__tests__/` folders)
- **E2E Tests**: Playwright (in `apps/web/e2e/`)
- **Test Patterns**: Follow existing test structure
- **Coverage**: Aim for meaningful coverage of new logic

## Common Patterns to Follow

### Adding a New Game Mechanic

1. Define types in `packages/lib/src/types/`
2. Implement logic in `packages/engine/src/`
3. Add tests in `packages/engine/__tests__/`
4. Export from package index
5. Use in engine simulation

### Adding a New Frontend Feature

1. Create page/component in `apps/web/app/` or `apps/web/components/`
2. Use existing UI patterns (PixelButton, PixelPanel, etc.)
3. Integrate with existing state management
4. Add E2E tests if user-facing

### Adding a New Agent Behavior

1. Create plugin in `packages/agents/src/plugins/`
2. Register in agent wrapper
3. Follow ElizaOS patterns
4. Update agent memory structure if needed

## Key Principles

1. **Determinism**: Game engine must be deterministic and reproducible
2. **Type Safety**: Use TypeScript strictly, avoid `any`
3. **Separation of Concerns**: Engine logic separate from UI, agents propose actions, engine executes
4. **Testability**: Write tests for new features
5. **Documentation**: Document complex logic and integration points
6. **Consistency**: Follow existing code patterns and conventions

## Resources

- **Architecture Docs**: `arc/Architecture.md`, `arc/dungeon-engine.md`, `arc/frontend-spec.md`
- **Game Design**: `agent-guide/game-design.md`
- **Contributing**: `CONTRIBUTING.md`
- **Contract Info**: `developer-docs/setup/CONTRACT_ALIGNMENT.md`

## Questions?

When in doubt:
1. Look at existing similar code
2. Follow the patterns you see
3. Ask for clarification in your contribution README
4. Keep code simple and maintainable







