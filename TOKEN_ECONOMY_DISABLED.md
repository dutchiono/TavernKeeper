# Token Economy - DISABLED

**Date:** 2026-02-16  
**Decision:** Focus on core dungeon gameplay, disable token economy features

## Summary

The KEEP and MON token economy features have been soft-disabled via feature flags to allow the team to focus on core dungeon gameplay mechanics. All code is preserved for potential future re-enablement.

## What Was Disabled

### Smart Contracts (NOT deployed)
- `KeepToken.sol` - KEEP ERC20 token
- `KeepTokenV2.sol` - Upgraded KEEP token
- `SwapRouterV4.sol` - Token swap router
- `CellarZapV4.sol` - Cellar liquidity zapping
- `staking/KEEPStaking.sol` - KEEP token staking
- `staking/LPStaking.sol` - LP token staking
- `LPRecoveryHelper.sol` - LP recovery utilities

### API Routes (Disabled via feature flags)
- `/api/staking/top-stakers` - Returns "feature disabled" message
- `/api/cellar/notify-raid` - Returns "feature disabled" message

### Feature Flags
Location: `apps/web/lib/feature-flags.ts`

```typescript
export const FEATURE_FLAGS = {
  tokens: false,       // KEEP/MON token functionality
  staking: false,      // Token staking features
  cellar: false,       // Cellar liquidity/treasury features
  marketplace: false,  // Token-based marketplace
  
  // CORE GAME - ENABLED
  heroes: true,        // Hero NFTs (Adventurer.sol) ✅
  dungeons: true,      // Dungeon gameplay ✅
  inventory: true,     // Item management ✅
  agents: true,        // AI agent gameplay ✅
  parties: true,       // Party management ✅
}
```

## What Remains ENABLED

### Core Game Contracts (Still Active)
- ✅ `Adventurer.sol` - Hero NFTs (KEEP THIS)
- ✅ `DungeonGatekeeper.sol` - Dungeon access control
- ✅ `Inventory.sol` - Item management
- ✅ `ERC6551Account.sol` / `ERC6551Registry.sol` - Token-bound accounts for heroes
- ✅ `TavernKeeperV3.sol` - Main game contract
- ✅ `TownPosseManager.sol` - Party management

### API Routes (Still Active)
- ✅ `/api/heroes/*` - Hero management
- ✅ `/api/dungeons/*` - Dungeon operations
- ✅ `/api/inventory/*` - Inventory management
- ✅ `/api/agents/*` - AI agent gameplay
- ✅ `/api/marketplace/*` - NFT marketplace (heroes/items, NOT tokens)
- ✅ `/api/parties/*` - Party management
- ✅ `/api/loot/*` - Loot generation

## How to Re-Enable (Future)

If you decide to re-enable the token economy:

1. **Update feature flags:**
   ```typescript
   // In apps/web/lib/feature-flags.ts
   tokens: true,
   staking: true,
   cellar: true,
   ```

2. **Uncomment API implementations:**
   - `apps/web/app/api/staking/top-stakers/route.ts` (see commented code)
   - `apps/web/app/api/cellar/notify-raid/route.ts` (see commented code)

3. **Deploy contracts:**
   - Review and test all token contracts
   - Deploy to Base network
   - Update contract addresses in environment variables

4. **Test thoroughly:**
   - Token minting
   - Staking mechanics
   - Cellar raids
   - Integration with hero gameplay

## Implementation Strategy

This was implemented as a "soft disable" rather than deleting code:

- **Contracts:** Left in repository, simply not deployed
- **API Routes:** Feature flag checks return early with disabled messages
- **UI Components:** Hidden via feature flag checks (to be added as needed)
- **Comments:** All disabled code preserved with clear markers

## Benefits of This Approach

1. **Reversible:** Easy to re-enable without rewriting code
2. **Clean:** Feature flags provide single source of truth
3. **Safe:** No code deletion means no accidental removal of working logic
4. **Clear:** Comments and documentation explain why features are disabled

## Related Files

- Feature flags: `apps/web/lib/feature-flags.ts`
- Staking API: `apps/web/app/api/staking/top-stakers/route.ts`
- Cellar API: `apps/web/app/api/cellar/notify-raid/route.ts`
- Token contracts: `packages/contracts/contracts/Keep*.sol`
- Staking contracts: `packages/contracts/contracts/staking/*.sol`

## Next Steps

Focus on core gameplay:
1. ✅ Fix TypeScript build errors
2. ✅ Fix map converter
3. ✅ Build agent action endpoint
4. 🔄 Improve hero NFT graphics
5. 🔄 Test complete dungeon playthrough