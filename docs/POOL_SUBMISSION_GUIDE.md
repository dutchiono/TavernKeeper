# Uniswap V3 Pool Submission Guide

This guide provides information for submitting the KEEP/MON Uniswap V3 pool to DEX aggregators and other discovery services.

## Pool Information

### Mainnet (Monad Chain ID: 143)

**Pool Address**: See `apps/web/lib/contracts/addresses.ts` for current deployment

**Pool Parameters:**
- **Token 0**: WMON (Wrapped MON) - See addresses.ts
- **Token 1**: KEEP Token - `0x2D1094F5CED6ba279962f9676d32BE092AFbf82E`
- **Fee Tier**: 10000 (1.0%)
- **Tick Spacing**: 200

**Pool Creation:**
The pool is created using Uniswap V3's NonfungiblePositionManager. The pool uses:
- Full range liquidity (tickLower: -887200, tickUpper: 887200)
- 1% fee tier
- WMON/KEEP pair

### Testnet (Monad Testnet Chain ID: 10143)

**Pool Address**: See `apps/web/lib/contracts/addresses.ts` for testnet deployment

**Pool Parameters:**
- **Token 0**: WMON (Wrapped MON) - See addresses.ts
- **Token 1**: KEEP Token - `0x96982EC3625145f098DCe06aB34E99E7207b0520`
- **Fee Tier**: 10000 (1.0%)
- **Tick Spacing**: 200

## The Cellar V3 Contract

**TheCellarV3** manages a single Uniswap V3 NFT position:
- LP token minting (ERC20 "CLP" tokens)
- Liquidity provision via Position Manager
- Raid/auction mechanics
- Fee collection and pot accumulation

**Contract Address**: See `apps/web/lib/contracts/addresses.ts`

## Token Information

### MON (Native)
- **Type**: Native currency (ETH equivalent on Monad)
- **Symbol**: MON
- **Decimals**: 18
- **Address**: `0x0000000000000000000000000000000000000000`

### KEEP Token
- **Type**: ERC-20
- **Symbol**: KEEP
- **Name**: Keep Token
- **Decimals**: 18
- **Mainnet Address**: `0x2D1094F5CED6ba279962f9676d32BE092AFbf82E`
- **Testnet Address**: `0x96982EC3625145f098DCe06aB34E99E7207b0520`

## Current Status

✅ **Uniswap V3 pools are automatically discovered** by standard DEX aggregators (1inch, Paraswap, Matcha, etc.) because:

1. V3 uses standard pool structure compatible with aggregators
2. V3 pools are indexed by standard subgraph services
3. Aggregators have full V3 support

## Submission Process

### Option 1: Automatic Discovery

Most major aggregators automatically discover V3 pools:
- **1inch**: Automatically indexes V3 pools
- **Paraswap**: Full V3 support
- **Matcha**: V3 integration available
- **Uniswap Interface**: Full V3 support

The pool should be automatically discoverable once it has liquidity and is properly initialized.

### Option 2: Manual Integration Request

If the pool is not automatically discovered, contact aggregator teams directly:

1. **Provide Pool Address** (from addresses.ts)
2. **Share Pool Details** (this document)
3. **Request V3 Integration** for Monad chain
4. **Provide Router Contract** (SimpleSwapRouter address from addresses.ts)

### Option 3: Use SimpleSwapRouter

A SimpleSwapRouter contract is deployed for easier swaps:
- Implements `IUniswapV3SwapCallback`
- Handles direct pool swaps
- Provides simpler interface for swaps

**Router Address**: See `apps/web/lib/contracts/addresses.ts`

## Contract Addresses Reference

All addresses are documented in:
- `apps/web/lib/contracts/addresses.ts`
- `packages/contracts/DEPLOYMENT_TRACKER.md`

## Additional Resources

- **Uniswap V3 Documentation**: https://docs.uniswap.org/contracts/v3/overview
- **Position Manager Interface**: See `packages/contracts/contracts/v3/TheCellarV3.sol`
- **Swap Router**: See `packages/contracts/contracts/v3/SimpleSwapRouter.sol`
- **Project Documentation**: https://docs.tavernkeeper.gg

## Notes for Aggregators

1. **Pool Initialization**: Pool must be initialized with liquidity before swaps
2. **Liquidity Requirement**: Pool must have liquidity > 0
3. **Token Order**: Token0 = WMON, Token1 = KEEP (sorted by address)
4. **Wrapped Native**: MON must be wrapped to WMON for swaps
5. **Fee Structure**: 1% fee (10000 basis points)
6. **Full Range**: Position uses full tick range (-887200 to 887200)

## Contact

For questions or integration support:
- **Documentation**: See project README
- **Issues**: Open a GitHub issue
- **Contract Addresses**: See `apps/web/lib/contracts/addresses.ts`

