# Contract Alignment & Validation System

## Overview

This is a **comprehensive contract validation system** that ensures contract addresses, proxy configurations, versions, and ABIs are properly aligned between the game code and deployed contracts. The system supports upgradeable contracts using proxy patterns (UUPS, Transparent, Beacon) and validates that implementations match expectations.

## Architecture

### Contract Registry (`lib/contracts/registry.ts`)

Central registry that defines:
- Contract addresses (proxy and implementation)
- Contract versions (semantic versioning)
- Proxy types (UUPS, Transparent, Beacon, Minimal, None)
- Required ABIs and function signatures
- Chain IDs

### Contract Validator (`lib/contracts/validator.ts`)

Robust validation system that:
- ✅ Validates address format and checksumming
- ✅ Detects proxy patterns (UUPS, Transparent, Beacon, Minimal)
- ✅ Validates implementation addresses match proxy configurations
- ✅ Checks on-chain contract existence
- ✅ Validates ABI compatibility (required functions exist)
- ✅ Tracks contract versions
- ✅ Provides detailed error and warning reports

## Contract Architecture

### Upgradeable Contracts (Using Proxies)

**All game contracts should use upgradeable proxy patterns** to allow for future updates:

1. **GoldToken** (ERC-20): Should use UUPS proxy
2. **Inventory** (ERC-1155): Should use UUPS proxy
3. **Adventurer** (ERC-721): Should use UUPS proxy
4. **TavernKeeper** (ERC-721): Should use UUPS proxy

**Proxy Pattern Benefits:**
- Upgradeable implementation without changing address
- Preserves storage layout
- Allows bug fixes and feature additions
- Maintains user trust (same address)

### ERC-6551 (Token Bound Accounts)

**Important**: ERC-6551 uses CREATE2 (deterministic addresses), not traditional proxies:

1. **Registry Contract**: Single registry that uses CREATE2 to deploy deterministic TBA addresses
2. **Implementation Contract**: Account implementation deployed via CREATE2 as minimal proxies (EIP-1167)
3. **TBA Addresses**: Each NFT gets a unique TBA address computed deterministically

The registry and implementation themselves are typically NOT upgradeable (they're infrastructure contracts).

## Validation Features

### 1. Address Validation
- ✅ Valid Ethereum address format (0x + 40 hex chars)
- ✅ No placeholder addresses (0x..., 0x0, etc.)
- ✅ Properly checksummed (EIP-55)
- ✅ Addresses configured in environment variables

### 2. Proxy Detection & Validation
- ✅ Detects proxy patterns (UUPS, Transparent, Beacon, Minimal)
- ✅ Validates implementation addresses match configuration
- ✅ Checks proxy admin/owner addresses
- ✅ Verifies proxy type matches expected configuration

### 3. On-Chain Validation
- ✅ Validates contracts exist on-chain (have code)
- ✅ Checks implementation addresses are correct
- ✅ Verifies proxy storage slots (EIP-1967)

### 4. ABI Compatibility
- ✅ Validates required functions exist
- ✅ Checks function signatures match expectations
- ✅ Ensures game code can interact with contracts

### 5. Version Tracking
- ✅ Tracks contract versions (semantic versioning)
- ✅ Validates version compatibility
- ✅ Warns about version mismatches

## Usage

### Running Validation Tests

```bash
# Run contract validation tests
pnpm test __tests__/lib/contracts.test.ts

# Or run all tests (includes contract validation)
pnpm test
```

### Programmatic Validation

```typescript
import { validateAllContracts, validateContract } from '@/lib/contracts';
import { CONTRACT_REGISTRY } from '@/lib/contracts/registry';

// Validate all contracts
const results = await validateAllContracts({
  validateOnChain: true,  // Validate contracts exist on-chain
  validateProxy: true,     // Validate proxy configurations
  validateABI: true,      // Validate ABI compatibility
  rpcUrl: 'https://...',   // Optional custom RPC
});

// Validate single contract
const result = await validateContract('GOLD_TOKEN', CONTRACT_REGISTRY.GOLD_TOKEN, {
  validateOnChain: true,
  validateProxy: true,
});
```

## Environment Variables

### Required for Upgradeable Contracts

```env
# Proxy addresses (what game code uses)
NEXT_PUBLIC_ERC20_TOKEN_ADDRESS=0x...              # GoldToken proxy
NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS=0x...       # Inventory proxy
NEXT_PUBLIC_ADVENTURER_CONTRACT_ADDRESS=0x...      # Adventurer proxy
NEXT_PUBLIC_TAVERNKEEPER_CONTRACT_ADDRESS=0x...    # TavernKeeper proxy

# Implementation addresses (for validation)
NEXT_PUBLIC_ERC20_TOKEN_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_INVENTORY_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_ADVENTURER_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_TAVERNKEEPER_IMPLEMENTATION_ADDRESS=0x...

# ERC-6551 (not upgradeable)
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x...

# Other contracts
NEXT_PUBLIC_PSEUDOSWAP_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_PSEUDOSWAP_FACTORY_ADDRESS=0x...
```

## Contract Deployment Checklist

When deploying contracts:

1. ✅ Deploy implementation contracts
2. ✅ Deploy proxy contracts (UUPS/Transparent) pointing to implementations
3. ✅ Initialize proxy contracts
4. ✅ Update `.env` with proxy addresses (what game uses)
5. ✅ Update `.env` with implementation addresses (for validation)
6. ✅ Update `lib/contracts/registry.ts` with new versions
7. ✅ Run validation tests: `pnpm test __tests__/lib/contracts.test.ts`
8. ✅ Verify all tests pass

## Upgrading Contracts

When upgrading contracts:

1. ✅ Deploy new implementation contract
2. ✅ Upgrade proxy to point to new implementation
3. ✅ Update `lib/contracts/registry.ts` with new version
4. ✅ Update implementation address in `.env`
5. ✅ Run validation tests to verify upgrade
6. ✅ Test game functionality with new implementation

## Integration with CI/CD

These tests should be run:
- ✅ In CI/CD pipeline before deployment
- ✅ Before merging PRs that touch contract addresses
- ✅ As part of the standard test suite (`pnpm test`)
- ✅ After contract deployments
- ✅ After contract upgrades

## Current Status

Based on the test results:

- ✅ Comprehensive validation system implemented
- ✅ Proxy detection and validation working
- ✅ Version tracking system in place
- ⚠️ Most contract addresses are not configured (using fallbacks)
- ⚠️ Contracts may not be deployed yet on Monad testnet
- ⚠️ Contracts need to be converted to upgradeable proxy pattern

## Next Steps

1. **Convert Contracts to Upgradeable**: Update contracts to use UUPS proxy pattern
2. **Deploy Contracts**: Deploy all contracts to Monad testnet/mainnet with proxies
3. **Update .env**: Set all `NEXT_PUBLIC_*_ADDRESS` variables with deployed addresses
4. **Update Registry**: Set correct versions and ABIs in `lib/contracts/registry.ts`
5. **Verify Alignment**: Run tests to ensure everything matches
6. **Enable On-Chain Validation**: Configure RPC URL to enable full validation

This ensures contract addresses are always aligned, proxies are correctly configured, and the game code stays synchronized with on-chain implementations.

