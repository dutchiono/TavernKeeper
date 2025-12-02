# m00n-cabal Technical Analysis

## Repository Status

**Repository URL**: `git@github.com:mugrebot/m00n-cabal.git`
**Status**: ✅ Repository cloned and analyzed
**Analysis Date**: 2025-12-02
**Repository Type**: Next.js Frontend Application (Not Solidity Contracts)

## Key Discovery

**Important**: m00n-cabal is NOT a smart contract repository. It is a **Next.js frontend application** that tracks, visualizes, and displays Uniswap V4 LP positions on Monad. However, it contains valuable patterns and concepts that can inform the Bar Regulars and Town Posse implementation.

## Repository Structure

```
m00n-cabal/
├── app/
│   ├── api/                    # API routes
│   │   ├── lp-leaderboard/     # Leaderboard endpoint
│   │   ├── lp-funding/         # Token balance/allowance checks
│   │   ├── lp-solar-system/    # Solar system visualization data
│   │   └── engagement/         # Social engagement tracking
│   ├── lib/
│   │   ├── uniswapV4Positions.ts    # Core LP position tracking
│   │   ├── m00nSolarSystem.ts       # Visualization logic
│   │   ├── lpTelemetry.ts           # Leaderboard building
│   │   ├── tiers.ts                 # Engagement tier system
│   │   └── pricing/                 # Price feeds
│   └── components/
│       └── M00nSolarSystem.tsx      # React visualization component
├── scripts/
│   └── build-airdrop-json.ts        # Data processing
└── tests/                            # Unit tests
```

## Core Functionality

### 1. LP Position Tracking (`uniswapV4Positions.ts`)

**Purpose**: Query and track Uniswap V4 LP positions on Monad

**Key Functions**:
- `getPositionIds(owner)` - Get all position token IDs for a user from subgraph
- `getPositionDetails(tokenId)` - Get full position details (ticks, liquidity, pool key)
- `getManyPositionDetails(tokenIds)` - Batch fetch position details
- `enrichPositionWithAmounts(position)` - Calculate token amounts and range status
- `getUserPositionsSummary(owner)` - Combined view of user's positions

**Key Patterns**:
- Uses Uniswap V4 subgraph for position discovery
- On-chain verification via PositionManager contract
- Decodes packed position info (tickLower, tickUpper)
- Calculates position value in USD
- Tracks range status (below-range, in-range, above-range)

**Relevance to InnKeeper**:
- Can be adapted to track group LP positions
- Pattern for aggregating multiple positions
- Range status tracking useful for position health monitoring

### 2. Leaderboard System (`lpTelemetry.ts`)

**Purpose**: Build leaderboards of top LP positions

**Key Features**:
- Ranks positions by USD value
- Categorizes by range status (crash_band, upside_band, in_range)
- Tracks top positions overall
- Includes special labels (e.g., "Clanker Pool")
- Caches leaderboard snapshots

**Data Structure**:
```typescript
interface LeaderboardSnapshot {
  updatedAt: string;
  moonPriceUsd: number | null;
  wmonPriceUsd: number | null;
  crashBand: LeaderboardEntry[];      // Above range
  upsideBand: LeaderboardEntry[];     // Below range
  mixedBand: LeaderboardEntry[];      // In range
  overall: LeaderboardEntry[];
}
```

**Relevance to InnKeeper**:
- Can rank Bar Regulars groups by total value
- Can rank Town Posse groups by TVL
- Leaderboard visualization for competitive elements
- Tier-based rankings could map to contribution levels

### 3. Solar System Visualization (`m00nSolarSystem.ts`)

**Purpose**: Visual representation of LP positions as a solar system

**Key Features**:
- Largest positions = largest planets
- Positions orbit around center
- Size based on USD value
- Animated rotation
- Top 16 positions displayed

**Visualization Logic**:
- Normalizes radii based on position value
- Computes orbital positions
- Animated rotation over time
- Truncates addresses for display

**Relevance to InnKeeper**:
- Could visualize Bar Regulars groups as planets
- Town Posse groups as larger celestial bodies
- Visual hierarchy based on group size
- Engaging way to display group positions

### 4. Tier System (`tiers.ts`)

**Purpose**: Engagement-based tier system for social rewards

**Tiers**:
- **Initiate** (1+ replies): Voidsteel Coffer
- **Shadow Adept** (25+ replies): Monad Crystal Cache
- **Cabal Lieutenant** (50+ replies): Eclipse Strongbox
- **Eclipsed Council** (100+ replies): Void Throne Reliquary

**Key Functions**:
- `getTierByReplyCount(count)` - Determine tier from engagement
- Threshold-based progression
- Flavor text and icons per tier

**Relevance to InnKeeper**:
- **Bar Regulars**: Could use contribution-based tiers
- **Town Posse**: Perfect match for tiered membership
- Tier progression based on LP contribution
- Visual rewards for different tiers

### 5. Position Telemetry (`lpTelemetry.ts`)

**Purpose**: Aggregate and cache position data

**Key Features**:
- Builds solar system payload (top positions)
- Builds leaderboard snapshot
- Caches data for performance
- Handles empty states
- Price tracking integration

**Relevance to InnKeeper**:
- Pattern for aggregating group positions
- Caching strategy for performance
- Snapshot building for dashboards

## Technology Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Blockchain**: Monad (Chain ID 143)
- **DEX**: Uniswap V4
- **Subgraph**: The Graph (Uniswap V4 on Monad)
- **Libraries**:
  - `@uniswap/v4-sdk` - Uniswap V4 SDK
  - `viem` - Ethereum library
  - `graphql-request` - Subgraph queries
  - `@farcaster/miniapp-sdk` - Farcaster integration

## Key Patterns for InnKeeper Integration

### 1. Position Aggregation Pattern

**m00n-cabal Approach**:
- Query subgraph for position token IDs
- Fetch on-chain details for each position
- Enrich with pool state and USD values
- Aggregate and rank

**InnKeeper Adaptation**:
- Track group LP positions (from CellarHook)
- Aggregate positions per group
- Calculate group totals
- Rank groups by TVL

### 2. Tier System Pattern

**m00n-cabal Approach**:
- Threshold-based tiers
- Progressive unlocking
- Visual representation
- Engagement-based

**InnKeeper Adaptation**:
- **Bar Regulars**: Contribution-based tiers
- **Town Posse**: Multi-tier system (Bronze, Silver, Gold)
- LP contribution thresholds
- Fee distribution by tier

### 3. Leaderboard Pattern

**m00n-cabal Approach**:
- Rank by USD value
- Categorize by status
- Cache snapshots
- API endpoint

**InnKeeper Adaptation**:
- Rank groups by total LP value
- Show top Bar Regulars groups
- Show top Town Posse groups
- Real-time or cached updates

### 4. Visualization Pattern

**m00n-cabal Approach**:
- Solar system metaphor
- Size = value
- Orbital animation
- Top N display

**InnKeeper Adaptation**:
- Visualize groups as entities
- Size based on group TVL
- Show member count
- Display contribution breakdown

## Integration Opportunities

### With CellarHook

**Current Gap**: CellarHook manages individual LP positions, not groups

**What We Need**:
- Track which LP tokens belong to which group
- Aggregate group positions
- Calculate group totals
- Distribute fees to group members

**m00n-cabal Patterns**:
- Position tracking approach
- Aggregation logic
- Value calculation

### With Frontend

**m00n-cabal Provides**:
- Leaderboard UI patterns
- Visualization components
- Tier display patterns
- Position status indicators

**InnKeeper Can Use**:
- Group leaderboard display
- Group visualization
- Tier badges
- Position health indicators

## Differences from Original Assumptions

### What We Expected:
- Solidity contracts for group LP management
- Smart contract patterns for shared positions
- On-chain group coordination

### What We Found:
- Frontend application for tracking positions
- Visualization and display patterns
- Tier and leaderboard systems
- Position telemetry and aggregation

### What We Can Still Use:
- Position tracking patterns
- Aggregation logic
- Tier system concepts
- Leaderboard patterns
- Visualization approaches

## Key Takeaways

1. **Position Tracking**: m00n-cabal shows how to effectively track and aggregate LP positions
2. **Tier System**: The engagement tier system can inspire Bar Regulars/Town Posse membership tiers
3. **Leaderboards**: Ranking and display patterns are directly applicable
4. **Visualization**: Solar system approach could inspire group visualization
5. **Telemetry**: Caching and snapshot patterns useful for performance

## Next Steps for InnKeeper

1. **Smart Contracts**: Still need to build Bar Regulars/Town Posse contracts (m00n-cabal doesn't provide these)
2. **Position Tracking**: Adapt m00n-cabal's tracking patterns for group positions
3. **Tier System**: Implement contribution-based tiers inspired by engagement tiers
4. **Leaderboards**: Build group leaderboards using m00n-cabal patterns
5. **Visualization**: Create group visualization inspired by solar system approach

## Conclusion

While m00n-cabal is not a smart contract repository, it provides valuable patterns for:
- Tracking and aggregating LP positions
- Building leaderboards and rankings
- Implementing tier systems
- Visualizing positions
- Caching and performance optimization

These patterns can inform the frontend and tracking aspects of Bar Regulars and Town Posse, while the smart contract implementation will need to be built from scratch based on the CellarHook architecture.

---

**Last Updated**: 2025-12-02 - Analysis complete based on actual repository code
