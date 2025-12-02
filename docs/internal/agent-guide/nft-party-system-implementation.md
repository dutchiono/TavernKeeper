# NFT Party System Implementation

## Overview

This document describes the implementation of the playable game flow connecting Map → Run Creation → Real-time Battle using Adventurer NFTs as party members. The system supports three party modes: solo (1 NFT), own-party (1-5 owned NFTs), and public parties (lobby system with auto-start when full).

## Architecture

### Party System Modes

1. **Solo Mode**: Player selects 1 Adventurer NFT and immediately starts a run
2. **Own-Party Mode**: Player selects 1-5 of their own Adventurer NFTs and starts a run
3. **Public Mode**: Player selects 1-4 NFTs, creates a lobby, waits for others to join (max 5 total), auto-starts when full

### Key Components

- **Party Selection UI**: Fetches user's owned NFTs and allows selection
- **Run Creation**: Creates run with NFT token IDs instead of character IDs
- **Run Worker**: Loads heroes from Adventurer contract and converts to game entities
- **Battle Scene**: Displays real-time combat from run simulation events
- **Public Party Lobby**: Real-time party status with invite codes

## Implementation Details

### 1. NFT Party Foundation

#### Updated Data Model

**File**: `apps/web/workers/runWorker.ts`
- Changed from loading characters from database to loading heroes from Adventurer contract
- Uses `getHeroByTokenId()` to fetch NFT metadata and generate stats
- Party array now contains NFT token IDs (strings) instead of character IDs

**File**: `apps/web/lib/services/heroOwnership.ts`
- Added `getHeroByTokenId(tokenId: string)`: Fetches hero from contract, parses metadata, generates Entity stats
- Added `getUserOwnedTokenIds(walletAddress: string)`: Gets all NFT token IDs owned by a wallet
- Uses contract registry to get Adventurer contract address (no hardcoded addresses)

**File**: `apps/web/lib/stores/gameStore.ts`
- Added `selectedPartyTokenIds: string[]` - Stores selected NFT token IDs for run creation
- Added `currentRunId: string | null` - Tracks active run ID
- Added `setSelectedPartyTokenIds()` and `setCurrentRunId()` actions

### 2. Party Selection UI

**File**: `apps/web/components/party/PartySelector.tsx`
- Fetches user's owned Adventurer NFTs via `/api/heroes/owned`
- Displays heroes with metadata (name, class icon, token ID)
- Supports three modes via `PartyModeSelector`:
  - Solo: Select exactly 1 hero
  - Own-party: Select 1-5 heroes
  - Public: Select 1-4 heroes, creates lobby
- For public mode, creates party via `/api/parties` with initial members
- Returns selected token IDs and mode to parent component

**File**: `apps/web/components/party/PartyModeSelector.tsx`
- Radio button UI for selecting party mode
- Three buttons: Solo, Own Party, Public

**File**: `apps/web/components/party/PublicPartyLobby.tsx`
- Displays party status with real-time member updates
- Shows invite code (for party owner)
- Polls party status every 2 seconds
- Auto-transitions to battle when party starts
- Shows member count and empty slots

**API Endpoints**:
- `GET /api/heroes/owned?walletAddress=...` - Get user's owned NFT token IDs
- `GET /api/heroes/token?tokenId=...` - Get hero data by token ID
- `POST /api/parties` - Create party (with initial hero token IDs)
- `GET /api/parties/[id]/status` - Get party status with members and run ID

### 3. Map → Run Creation Flow

**File**: `apps/web/components/scenes/MapScene.tsx`
- "ENTER AREA" button triggers party selection if no party selected
- If party selected, creates run via `runService.createRun()`
- Shows party selector modal when no party is selected
- Shows public party lobby when `currentPartyId` is set
- Polls run status and transitions to battle when run starts
- Displays loading states and error messages

**File**: `apps/web/lib/services/runService.ts`
- `createRun(params)`: Creates run with dungeon ID and party (NFT token IDs)
- `getRunStatus(runId)`: Gets run status from API

**File**: `apps/web/lib/hooks/useRunStatus.ts`
- Polls run status every 2 seconds
- Stops polling when run is completed
- Returns run status, loading state, and errors

**API Endpoints**:
- `POST /api/runs` - Create run (accepts `dungeonId` and `party` array of token IDs)
- `GET /api/runs/[id]` - Get run status

### 4. Real-time Battle Integration

**File**: `apps/web/components/scenes/BattleScene.tsx`
- Uses `useRunEvents()` to poll combat events from run
- Uses `useRunStatus()` to check for victory/defeat
- Parses combat events via `eventParser.ts`
- Updates entity HP states from events
- Displays battle log from parsed events
- Shows visual effects (shake, flash) on combat actions
- Auto-transitions to Inn on victory/defeat

**File**: `apps/web/lib/hooks/useRunEvents.ts`
- Polls `/api/runs/[id]/events` every 1.5 seconds
- Uses `since` parameter to only fetch new events
- Deduplicates events by ID
- Filters combat events (type: 'combat', 'damage', 'attack')
- Returns all events and filtered combat events

**File**: `apps/web/lib/services/eventParser.ts`
- `parseCombatEvent(event)`: Parses RunEvent into ParsedCombatEvent
- Extracts actorId, targetId, damage, hit, critical from event payload
- Generates human-readable messages for battle log
- `getEntityName(entityId, partyTokenIds)`: Gets display name for entity

**File**: `apps/web/app/api/runs/[id]/events/route.ts`
- Queries `world_events` table filtered by `run_id`
- Supports `since` query parameter for incremental fetching
- Returns events ordered by timestamp

### 5. Public Party System

**File**: `apps/web/lib/services/partyService.ts`
- `createParty()`: Creates party with initial hero token IDs (uses contract registry)
- `joinParty()`: Joins party with NFT token ID, auto-starts run when party reaches 5 members
- `getPartyMembers()`: Gets all members of a party
- Auto-start logic: When 5th member joins, creates run and enqueues simulation

**File**: `apps/web/lib/hooks/usePartyStatus.ts`
- Polls `/api/parties/[id]/status` every 2 seconds
- Returns party status, members, member count, and run ID
- Stops polling when party is completed/cancelled/in_progress

**File**: `apps/web/app/api/parties/[id]/status/route.ts`
- Returns party with members list
- If party is in_progress, queries runs table to find associated run ID
- Returns `memberCount`, `isFull`, and `runId` if available

**File**: `apps/web/app/api/parties/[id]/join/route.ts`
- Verifies NFT ownership before allowing join
- Uses contract registry to get Adventurer contract address
- Returns `{ success, autoStarted, runId }` if party auto-started

## Game Flow

### Solo/Own-Party Flow

1. User navigates to Map (`/?view=map`)
2. Clicks "ENTER AREA" button
3. Party selector modal appears (if no party selected)
4. User selects mode (solo/own) and chooses NFTs
5. Clicks "Confirm Party"
6. MapScene creates run via `runService.createRun()`
7. Run is queued for simulation
8. MapScene polls run status
9. When run starts, transitions to Battle view
10. BattleScene polls run events and displays combat
11. On victory/defeat, returns to Inn

### Public Party Flow

1. User navigates to Map
2. Clicks "ENTER AREA" button
3. Party selector modal appears
4. User selects "Public" mode and chooses 1-4 NFTs
5. Clicks "Create Lobby"
6. Party is created with initial members
7. PublicPartyLobby component displays:
   - Invite code (for owner)
   - Current members (1-4)
   - Empty slots
   - Real-time updates as others join
8. Other users join with their NFTs (via invite code)
9. When 5th member joins, party auto-starts:
   - Creates run with all 5 NFT token IDs
   - Enqueues simulation
   - Updates party status to 'in_progress'
10. All party members see transition to Battle
11. Battle displays real-time combat for all members

## Contract Integration

### Using Contract Registry

All contract addresses are retrieved from the registry system:

```typescript
import { CONTRACT_REGISTRY, getContractAddress } from '../contracts/registry';

const adventurerAddress = getContractAddress(CONTRACT_REGISTRY.ADVENTURER);
```

This automatically switches between Monad testnet and localhost based on `NEXT_PUBLIC_USE_LOCALHOST` environment variable.

### NFT Ownership Verification

- `verifyOwnership()`: Checks on-chain ownership before allowing hero in party
- `getUserOwnedTokenIds()`: Fetches user's NFTs directly from contract
- Uses `getTokensOfOwner()` if available, falls back to event scanning

## Database Schema

### Runs Table
- `party`: TEXT[] - Array of NFT token IDs (not character IDs)
- `dungeon_id`: References dungeon
- `start_time`, `end_time`: Timestamps
- `result`: 'victory' | 'defeat' | 'timeout' | 'abandoned' | 'error'

### Parties Table
- `owner_id`: Wallet address of party creator
- `dungeon_id`: Target dungeon
- `status`: 'waiting' | 'ready' | 'in_progress' | 'completed' | 'cancelled'
- `max_members`: 5 (hardcoded)

### Party Members Table
- `party_id`: References party
- `user_id`: Wallet address
- `hero_token_id`: NFT token ID (string)
- `hero_contract_address`: Adventurer contract address

### World Events Table
- `run_id`: References run
- `type`: Event type ('combat', 'exploration', etc.)
- `payload`: JSONB event data
- `timestamp`: ISO timestamp

## API Endpoints Summary

### Heroes
- `GET /api/heroes/owned?walletAddress=...` - Get user's owned NFT token IDs
- `GET /api/heroes/token?tokenId=...` - Get hero data by token ID

### Runs
- `POST /api/runs` - Create run (`dungeonId`, `party` array of token IDs)
- `GET /api/runs/[id]` - Get run status
- `GET /api/runs/[id]/events?since=...` - Get run events (incremental)

### Parties
- `POST /api/parties` - Create party (`ownerId`, `dungeonId`, `initialHeroTokenIds`)
- `GET /api/parties/[id]/status` - Get party status with members
- `POST /api/parties/[id]/join` - Join party (`userId`, `heroTokenId`, `userWallet`)
- `POST /api/parties/[id]/invite` - Generate invite code

## Key Functions

### Hero Loading
```typescript
// Get hero Entity from NFT token ID
const hero = await getHeroByTokenId(tokenId);
// Returns: { id, name, stats, metadata }

// Get user's owned NFTs
const tokenIds = await getUserOwnedTokenIds(walletAddress);
// Returns: string[] of token IDs
```

### Run Creation
```typescript
const result = await runService.createRun({
    dungeonId: 'abandoned-cellar',
    party: ['123', '456', '789'], // NFT token IDs
});
// Returns: { id: runId, status: 'queued' }
```

### Event Parsing
```typescript
const parsed = parseCombatEvent(event);
// Returns: { type, actorId, targetId, damage, hit, critical, message }
```

## State Management

### Game Store (`useGameStore`)
- `selectedPartyTokenIds`: Currently selected NFTs for run
- `currentRunId`: Active run ID
- `currentView`: Current game view (INN, MAP, BATTLE)

### Party Store (`usePartyStore`)
- `currentParty`: Active party object
- `currentMembers`: Party members array
- Party CRUD operations

## Error Handling

- Map loading errors: Shows retry button
- Run creation errors: Displays error message below button
- Battle loading: Shows "Loading battle..." with animation
- Party join errors: Displays in party selector
- Event fetch errors: Logged to console, doesn't break UI

## Loading States

- Map: "Loading Map..." with icon
- Party Selector: "Loading your heroes..."
- Battle: "Loading battle..." with pulse animation
- Run Creation: Button shows "CREATING RUN..."
- Party Status: "Loading party..."

## Future Enhancements

1. **WebSocket Support**: Replace polling with WebSocket for real-time updates
2. **Party Invite Links**: Deep links for sharing party invites
3. **Hero Stats from Metadata**: Store/load stats from NFT metadata instead of defaults
4. **Multiple Enemies**: Display all enemies in battle, not just primary
5. **Party Chat**: In-lobby chat for coordination
6. **Run History**: View past runs and results
7. **Rewards System**: Distribute loot/rewards after successful runs

## Testing Checklist

- [x] Solo party: 1 NFT → Create run → Battle works
- [x] Own-party: 3 NFTs → Create run → Battle works
- [x] Public party: Create lobby → Others join → Auto-start → Battle works
- [x] Battle events display correctly in real-time
- [x] Victory/defeat conditions trigger correctly
- [x] Navigation flow works end-to-end
- [x] Error states handled gracefully
- [x] Contract addresses use registry (no hardcoded values)

## Files Created

### Components
- `apps/web/components/party/PartySelector.tsx`
- `apps/web/components/party/PartyModeSelector.tsx`
- `apps/web/components/party/PublicPartyLobby.tsx`

### Services
- `apps/web/lib/services/runService.ts`
- `apps/web/lib/services/eventParser.ts`

### Hooks
- `apps/web/lib/hooks/useRunStatus.ts`
- `apps/web/lib/hooks/useRunEvents.ts`
- `apps/web/lib/hooks/usePartyStatus.ts`

### API Routes
- `apps/web/app/api/heroes/owned/route.ts`
- `apps/web/app/api/heroes/token/route.ts`
- `apps/web/app/api/runs/[id]/events/route.ts`
- `apps/web/app/api/parties/[id]/status/route.ts`

## Files Modified

- `apps/web/workers/runWorker.ts` - Load heroes from contract
- `apps/web/lib/services/heroOwnership.ts` - Added NFT loading functions
- `apps/web/lib/services/partyService.ts` - Updated for NFT token IDs, auto-start
- `apps/web/lib/stores/gameStore.ts` - Added party and run state
- `apps/web/components/scenes/MapScene.tsx` - Connected to run creation
- `apps/web/components/scenes/BattleScene.tsx` - Real-time events instead of mock
- `apps/web/app/api/parties/route.ts` - Accept initial hero token IDs
- `apps/web/app/api/parties/[id]/join/route.ts` - Use contract registry

## Notes

- All contract addresses use `CONTRACT_REGISTRY` and `getContractAddress()` - no hardcoded addresses
- Party members are NFT token IDs (strings), not character IDs
- Run simulation happens asynchronously via BullMQ worker
- Battle events are polled every 1.5 seconds (can be upgraded to WebSocket later)
- Public parties auto-start when 5th member joins (no manual start needed)
- Party status endpoint queries runs table to find associated run ID when party is in_progress
