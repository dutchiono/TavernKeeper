# Token Economy Contracts - DISABLED

**Status:** NOT DEPLOYED  
**Date:** 2026-02-16  
**Reason:** Strategic focus on core dungeon gameplay

## Disabled Contracts

The following contracts are **not deployed** and should not be used:

### Token Contracts
- `KeepToken.sol` - KEEP ERC20 token
- `KeepTokenV2.sol` - Upgraded version
- `MockERC20.sol` - Test token

### DeFi Infrastructure
- `SwapRouterV4.sol` - Token swapping
- `CellarZapV4.sol` - Liquidity zapping
- `UniswapIntegration.sol` - Uniswap integration
- `LPRecoveryHelper.sol` - LP recovery
- `V4DependencyHelper.sol` - V4 utilities

### Staking Contracts
- `staking/KEEPStaking.sol` - KEEP token staking
- `staking/LPStaking.sol` - LP token staking

## Active Game Contracts

These contracts **are deployed** and active:

- ✅ `Adventurer.sol` - Hero NFTs (core game asset)
- ✅ `DungeonGatekeeper.sol` - Dungeon access
- ✅ `Inventory.sol` - Item management
- ✅ `TavernKeeperV3.sol` - Main game logic
- ✅ `TownPosseManager.sol` - Party system
- ✅ `TavernRegularsManager.sol` - Regular management
- ✅ `ERC6551Account.sol` / `ERC6551Registry.sol` - Token-bound accounts

## Why These Are Disabled

Token economy features (KEEP/MON tokens, staking, treasury) were disabled to:
1. Focus development on core dungeon gameplay
2. Simplify the game mechanics
3. Reduce complexity for initial launch
4. Allow easier iteration on game balance

## Re-enabling

To re-enable token economy:
1. See `/TOKEN_ECONOMY_DISABLED.md` in repository root
2. Update feature flags in `apps/web/lib/feature-flags.ts`
3. Deploy these contracts to Base network
4. Update API routes to use deployed addresses

## More Information

See `/TOKEN_ECONOMY_DISABLED.md` for complete documentation.