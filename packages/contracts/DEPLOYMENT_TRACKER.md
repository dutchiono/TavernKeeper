# Contract Deployment Tracker

**CRITICAL: DO NOT REDEPLOY CONTRACTS WITHOUT UPDATING THIS FILE**

This file tracks all contract deployments. **ALWAYS** update this file when deploying contracts.

## Current Status: ✅ DEPLOYED TO MONAD TESTNET

**All contracts have been deployed to Monad Testnet as UUPS upgradeable proxies.**

---

## Contract Inventory

### 1. ERC-6551 Infrastructure (Not Upgradeable)

#### ERC6551Registry
- **Status**: ✅ **DEPLOYED** (infrastructure contract, not upgradeable)
- **Type**: Direct implementation
- **Purpose**: Registry for creating Token Bound Accounts (TBAs)
- **Upgradeable**: No (infrastructure contract)
- **Deployed Address**: `0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C`
- **Network**: Monad Testnet
- **Deployment Date**: 2024-01-XX
- **Deployment TX**: See deployment output
- **Notes**: Standard ERC-6551 registry implementation

#### ERC6551Account (Implementation)
- **Status**: ✅ **DEPLOYED** (implementation contract, not upgradeable)
- **Type**: Direct implementation
- **Purpose**: TBA account implementation (deployed via CREATE2)
- **Upgradeable**: No (implementation contract)
- **Deployed Address**: `0x9B5980110654dcA57a449e2D6BEc36fE54123B0F`
- **Network**: Monad Testnet
- **Deployment Date**: 2024-01-XX
- **Deployment TX**: See deployment output
- **Notes**: Each NFT gets a unique TBA address via CREATE2

---

### 2. Game Contracts (Need Proxy Conversion)

#### GoldToken (ERC-20)
- **Status**: ✅ **DEPLOYED** - UUPS upgradeable proxy
- **Current Type**: UUPS Upgradeable Proxy ✅
- **Purpose**: In-game currency token
- **Upgradeable**: Yes ✅
- **Proxy Address**: `0x96982EC3625145f098DCe06aB34E99E7207b0520`
- **Implementation Address**: `0x8788E862023A49a77E8F27277a8b3F07B4E9A7d8`
- **Network**: Monad Testnet
- **Deployment Date**: 2024-01-XX
- **Deployment TX**: See deployment output
- **Initial Supply**: 1,000,000 GOLD
- **Notes**: Successfully deployed as UUPS proxy

#### Inventory (ERC-1155)
- **Status**: ✅ **DEPLOYED** - UUPS upgradeable proxy
- **Current Type**: UUPS Upgradeable Proxy ✅
- **Purpose**: ERC-1155 items/inventory contract
- **Upgradeable**: Yes ✅
- **Proxy Address**: `0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC`
- **Implementation Address**: `0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6`
- **Network**: Monad Testnet
- **Deployment Date**: 2024-01-XX
- **Deployment TX**: See deployment output
- **Fee Recipient**: `0xEC4bc7451B9058D42Ea159464C6dA14a322946fD` (deployer)
- **Notes**:
  - Successfully deployed as UUPS proxy
  - Has fee collection built-in via `claimLootWithFee()`
  - Fees go back to deployer wallet

#### Adventurer (ERC-721)
- **Status**: ✅ **DEPLOYED** - UUPS upgradeable proxy
- **Current Type**: UUPS Upgradeable Proxy ✅
- **Purpose**: Adventurer NFT contract
- **Upgradeable**: Yes ✅
- **Proxy Address**: `0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2`
- **Implementation Address**: `0xC1D9e381dF88841b16e9d01f35802B0583638e07`
- **Network**: Monad Testnet
- **Deployment Date**: 2024-01-XX
- **Deployment TX**: See deployment output
- **Notes**: Successfully deployed as UUPS proxy

#### TavernKeeper (ERC-721)
- **Status**: ✅ **DEPLOYED** - UUPS upgradeable proxy
- **Current Type**: UUPS Upgradeable Proxy ✅
- **Purpose**: TavernKeeper NFT contract
- **Upgradeable**: Yes ✅
- **Proxy Address**: `0x4Fff2Ce5144989246186462337F0eE2C086F913E`
- **Implementation Address**: `0xd8c9C56b1ef231207bAd219A488244aD34576F92`
- **Network**: Monad Testnet
- **Deployment Date**: 2024-01-XX
- **Deployment TX**: See deployment output
- **Notes**: Successfully deployed as UUPS proxy

---

## Deployment Checklist

### Before Deployment

- [x] Convert all game contracts to UUPS upgradeable pattern ✅
- [ ] Test proxy deployment locally
- [ ] Verify proxy initialization
- [ ] Test upgrade functionality
- [ ] Set fee recipient address for Inventory contract
- [x] Prepare deployment script with proxy pattern ✅

### Deployment Steps

1. **Deploy ERC-6551 Infrastructure:**
   - [ ] Deploy ERC6551Registry
   - [ ] Deploy ERC6551Account (implementation)
   - [ ] Verify deployments
   - [ ] Update this file with addresses

2. **Deploy Game Contracts (as Proxies):**
   - [ ] Deploy GoldToken implementation
   - [ ] Deploy GoldToken proxy
   - [ ] Initialize GoldToken proxy
   - [ ] Update this file

   - [ ] Deploy Inventory implementation
   - [ ] Deploy Inventory proxy
   - [ ] Initialize Inventory proxy (with fee recipient)
   - [ ] Update this file

   - [ ] Deploy Adventurer implementation
   - [ ] Deploy Adventurer proxy
   - [ ] Initialize Adventurer proxy
   - [ ] Update this file

   - [ ] Deploy TavernKeeper implementation
   - [ ] Deploy TavernKeeper proxy
   - [ ] Initialize TavernKeeper proxy
   - [ ] Update this file

3. **Post-Deployment:**
   - [ ] Verify all contracts on block explorer
   - [ ] Update `.env` files with addresses
   - [ ] Update `lib/contracts/registry.ts` with addresses
   - [ ] Run contract validation tests
   - [ ] Document proxy admin addresses

---

## Deployment History

### Monad Testnet

| Contract | Type | Address | Deployed | TX Hash | Notes |
|----------|------|---------|----------|---------|-------|
| ERC6551Registry | Direct | `0xca3f315D82cE6Eecc3b9E29Ecc8654BA61e7508C` | ✅ 2024-01-XX | See output | |
| ERC6551Account | Direct | `0x9B5980110654dcA57a449e2D6BEc36fE54123B0F` | ✅ 2024-01-XX | See output | |
| GoldToken | Proxy | `0x96982EC3625145f098DCe06aB34E99E7207b0520` | ✅ 2024-01-XX | See output | **USE THIS** |
| GoldToken | Impl | `0x8788E862023A49a77E8F27277a8b3F07B4E9A7d8` | ✅ 2024-01-XX | See output | |
| Inventory | Proxy | `0xA43034595E2d1c52Ab08a057B95dD38bCbFf87dC` | ✅ 2024-01-XX | See output | **USE THIS** |
| Inventory | Impl | `0xc03bC9D0BD59b98535aEBD2102221AeD87c820A6` | ✅ 2024-01-XX | See output | |
| Adventurer | Proxy | `0x2ABb5F58DE56948dD0E06606B88B43fFe86206c2` | ✅ 2024-01-XX | See output | **USE THIS** |
| Adventurer | Impl | `0xC1D9e381dF88841b16e9d01f35802B0583638e07` | ✅ 2024-01-XX | See output | |
| TavernKeeper | Proxy | `0x4Fff2Ce5144989246186462337F0eE2C086F913E` | ✅ 2024-01-XX | See output | **USE THIS** |
| TavernKeeper | Impl | `0xd8c9C56b1ef231207bAd219A488244aD34576F92` | ✅ 2024-01-XX | See output | |

### Monad Mainnet

| Contract | Type | Address | Deployed | TX Hash | Notes |
|----------|------|---------|----------|---------|-------|
| *Not deployed yet* | | | | | |

---

## Proxy Admin Addresses

**CRITICAL: Keep these secure!**

| Contract | Proxy Admin | Multisig? | Notes |
|----------|-------------|-----------|-------|
| GoldToken | `TBD` | `TBD` | |
| Inventory | `TBD` | `TBD` | |
| Adventurer | `TBD` | `TBD` | |
| TavernKeeper | `TBD` | `TBD` | |

---

## Upgrade History

### GoldToken
- **v1.0.0** - `TBD` - Initial deployment

### Inventory
- **v1.0.0** - `TBD` - Initial deployment (with fee collection)

### Adventurer
- **v1.0.0** - `TBD` - Initial deployment

### TavernKeeper
- **v1.0.0** - `TBD` - Initial deployment

---

## Required Changes Before Deployment

### 1. Convert Contracts to UUPS ✅ COMPLETE

All game contracts have been converted:
- ✅ Import `@openzeppelin/contracts-upgradeable`
- ✅ Extend upgradeable base contracts
- ✅ Use `initialize()` instead of `constructor()`
- ✅ Include `_authorizeUpgrade()` for UUPS
- ✅ All contracts use UUPS pattern

### 2. Update Deployment Script ✅ COMPLETE

The deployment script has been updated:
- ✅ Deploys implementation contracts
- ✅ Deploys UUPS proxy contracts using `upgrades.deployProxy()`
- ✅ Initializes proxies with `initialize()` function
- ✅ Gets implementation addresses for tracking
- ✅ Includes upgrade script for future upgrades

### 3. Update Contract Registry

After deployment:
- [ ] Update `apps/web/lib/contracts/registry.ts` with addresses
- [ ] Update `.env` files
- [ ] Run validation tests

---

## Environment Variables to Update After Deployment

```env
# ERC-6551
NEXT_PUBLIC_ERC6551_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_ERC6551_IMPLEMENTATION_ADDRESS=0x...

# Game Contracts (Proxy Addresses)
NEXT_PUBLIC_ERC20_TOKEN_ADDRESS=0x...              # GoldToken proxy
NEXT_PUBLIC_INVENTORY_CONTRACT_ADDRESS=0x...       # Inventory proxy
NEXT_PUBLIC_ADVENTURER_CONTRACT_ADDRESS=0x...      # Adventurer proxy
NEXT_PUBLIC_TAVERNKEEPER_CONTRACT_ADDRESS=0x...    # TavernKeeper proxy

# Implementation Addresses (for validation)
NEXT_PUBLIC_ERC20_TOKEN_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_INVENTORY_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_ADVENTURER_IMPLEMENTATION_ADDRESS=0x...
NEXT_PUBLIC_TAVERNKEEPER_IMPLEMENTATION_ADDRESS=0x...

# Fee Recipient
NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS=0x...
```

---

## Important Notes

1. **NEVER redeploy contracts without updating this file**
2. **ALWAYS verify addresses on block explorer after deployment**
3. **Keep proxy admin keys secure** - use multisig for production
4. **Test upgrades on testnet before mainnet**
5. **Document all upgrades in the Upgrade History section**

---

## Test Wallets

**Deployer**: `0xEC4bc7451B9058D42Ea159464C6dA14a322946fD`
- This is the main deployer wallet
- Fee recipient is set to this address
- All fees collected go back to this wallet

**Test Wallets** (10 wallets, each funded with 1 MON):
1. `0xfAb9905E2238f1eDADB1a7F94C417555C43dA460`
2. `0x56A0C1061812CDA3a3e22EE42b974d0D4ECAD55F`
3. `0x373BC31d3b27061F86C530908307f238f09e7023`
4. `0xb60fDCA53aba16CF148FDA5c2F20E6538944d024`
5. `0x5CEa37b7b5C1A4A1321c5fa1138D46A333EF648b`
6. `0x67b10d3b2BB6cc64cb674cF4acCdfFCAfE9C4541`
7. `0x1a19C1C7447d761B9B291c7d49f0965de9CA8204`
8. `0x3509a95e78eBa980C247F5A05B787dC2ba70Ba61`
9. `0x8f461F731dfc965e2214c7D6700e9B5E24dE35c8`
10. `0xC8D9cA8Bc169875760848c5268a0fE006077A3dD`

**Wallet Management**:
- Private keys stored in `packages/contracts/wallets/testnet-keys.json` (gitignored)
- Wallet addresses in `packages/contracts/wallets/testnet-wallets.json`
- All wallets funded with 1 MON each for testing

## Last Updated

- **Date**: 2024-01-XX
- **Updated By**: Deployment Script
- **Reason**: Initial deployment to Monad Testnet - All contracts deployed as UUPS proxies

