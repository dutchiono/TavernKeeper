# Metadata Update Functionality Upgrade

## Overview
This upgrade adds `updateTokenURI()` functionality to **BOTH** Adventurer and TavernKeeper contracts, allowing NFT owners to update their metadata (e.g., change colors/appearance).

## Changes Made

### Adventurer Contract
- ✅ **Already has** `updateTokenURI(uint256 tokenId, string memory newUri)` function in code
- ✅ **Already has** `MetadataUpdated` event
- ✅ **ABI updated** in `apps/web/lib/contracts/registry.ts`
- ⚠️ **NEEDS VERIFICATION**: Check if deployed version has this function

### TavernKeeper Contract
- ✅ **Added** `updateTokenURI(uint256 tokenId, string memory newUri)` function
- ✅ **Added** `MetadataUpdated` event
- ✅ **ABI updated** in `apps/web/lib/contracts/registry.ts`
- ✅ **NEEDS DEPLOYMENT**: Must upgrade to deploy new function

## Current Mainnet Addresses (from FIRSTDEPLOYMENT.md)

### Adventurer
- **Proxy Address**: `0xb138Bf579058169e0657c12Fd9cc1267CAFcb935`
- **Current Implementation**: `0x71fb2B063569dD5B91c6241A9d6A41536894835A` (v4.0.0 - Signature-Based Pricing)
- **Network**: Monad Mainnet
- **Status**: ⚠️ **VERIFY IF updateTokenURI EXISTS IN DEPLOYED VERSION**

### TavernKeeper
- **Proxy Address**: `0x56B81A60Ae343342685911bd97D1331fF4fa2d29`
- **Current Implementation**: `0xA33dF761f3A72eDe5D38310a17fc8CF70798e0Be` (v4.0.0 - Signature-Based Pricing)
- **Network**: Monad Mainnet
- **Status**: ✅ **NEEDS UPGRADE** - updateTokenURI not yet deployed

## Pre-Deployment Verification

### Step 1: Verify Adventurer Contract

**Check if deployed Adventurer has updateTokenURI:**

```bash
# Option 1: Check on block explorer
# Go to: https://explorer.monad.xyz/address/0xb138Bf579058169e0657c12Fd9cc1267CAFcb935
# Check "Contract" tab → "Read Contract" → Look for updateTokenURI function

# Option 2: Use cast/ethers to check
npx hardhat run scripts/check_contract_function.ts --network monad
```

**If Adventurer DOES NOT have updateTokenURI:**
- ✅ Upgrade Adventurer first
- Then upgrade TavernKeeper

**If Adventurer ALREADY has updateTokenURI:**
- ✅ Only upgrade TavernKeeper
- Update tracking files accordingly

## Upgrade Steps

### Option A: Upgrade Both Contracts (If Adventurer Missing updateTokenURI)

#### 1. Upgrade Adventurer

```bash
cd packages/contracts

export CONTRACT_NAME=Adventurer
export PROXY_ADDRESS=0xb138Bf579058169e0657c12Fd9cc1267CAFcb935

npx hardhat run scripts/upgrade.ts --network monad
```

**Record:**
- Old Implementation: `0x71fb2B063569dD5B91c6241A9d6A41536894835A`
- New Implementation: `0x[ADVENTURER_NEW_IMPL]`

#### 2. Upgrade TavernKeeper

```bash
export CONTRACT_NAME=TavernKeeper
export PROXY_ADDRESS=0x56B81A60Ae343342685911bd97D1331fF4fa2d29

npx hardhat run scripts/upgrade.ts --network monad
```

**Record:**
- Old Implementation: `0xA33dF761f3A72eDe5D38310a17fc8CF70798e0Be`
- New Implementation: `0x[TAVERNKEEPER_NEW_IMPL]`

### Option B: Upgrade Only TavernKeeper (If Adventurer Already Has updateTokenURI)

```bash
cd packages/contracts

export CONTRACT_NAME=TavernKeeper
export PROXY_ADDRESS=0x56B81A60Ae343342685911bd97D1331fF4fa2d29

npx hardhat run scripts/upgrade.ts --network monad
```

**Record:**
- Old Implementation: `0xA33dF761f3A72eDe5D38310a17fc8CF70798e0Be`
- New Implementation: `0x[TAVERNKEEPER_NEW_IMPL]`

## Verification

### Verify Contracts on Block Explorer

After each upgrade:

```bash
# Verify Adventurer (if upgraded)
npx hardhat verify --network monad [ADVENTURER_NEW_IMPL]

# Verify TavernKeeper
npx hardhat verify --network monad [TAVERNKEEPER_NEW_IMPL]
```

### Test Functions

Test that `updateTokenURI` works for both contracts:

```bash
# Test Adventurer updateTokenURI (if upgraded)
# Test that:
# 1. Owner can update their token URI
# 2. Non-owner cannot update
# 3. Empty URI is rejected

# Test TavernKeeper updateTokenURI
# Same tests as above
```

## Update Deployment Tracking Files

### Update FIRSTDEPLOYMENT.md

Add to the "Upgrade History (Mainnet)" section:

```markdown
### 2025-01-XX: Metadata Update Functionality
- **Reason**: Added `updateTokenURI()` function to allow NFT owners to update metadata
- **Contracts Upgraded**:
  - **Adventurer** (if upgraded):
    - Proxy: `0xb138Bf579058169e0657c12Fd9cc1267CAFcb935`
    - Old Impl: `0x71fb2B063569dD5B91c6241A9d6A41536894835A`
    - New Impl: `0x[ADVENTURER_NEW_IMPL]` (or "Already deployed, no upgrade needed")
  - **TavernKeeper**:
    - Proxy: `0x56B81A60Ae343342685911bd97D1331fF4fa2d29`
    - Old Impl: `0xA33dF761f3A72eDe5D38310a17fc8CF70798e0Be`
    - New Impl: `0x[TAVERNKEEPER_NEW_IMPL]`
- **Status**: ✅ Success
- **Notes**:
  - Added `updateTokenURI(uint256 tokenId, string memory newUri)` function
  - Added `MetadataUpdated` event
  - Only token owner can update metadata
  - Frontend addresses unchanged (proxy addresses stay the same)
```

### Update DEPLOYMENT_TRACKER.md

#### Adventurer (if upgraded):

Add to the "Upgrade History" section under "Adventurer":

```markdown
- **v4.1.0** - `0x[ADVENTURER_NEW_IMPL]` - Metadata Update Functionality (2025-01-XX)
  - Added `updateTokenURI()` function for NFT owners (if not already deployed)
  - Added `MetadataUpdated` event (if not already deployed)
  - Allows owners to update metadata URI (for appearance changes, etc.)
  - **Proxy Address**: `0xb138Bf579058169e0657c12Fd9cc1267CAFcb935` (unchanged)
```

#### TavernKeeper:

Add to the "Upgrade History" section under "TavernKeeper":

```markdown
- **v4.1.0** - `0x[TAVERNKEEPER_NEW_IMPL]` - Metadata Update Functionality (2025-01-XX)
  - Added `updateTokenURI()` function for NFT owners
  - Added `MetadataUpdated` event
  - Allows owners to update metadata URI (for appearance changes, etc.)
  - **Proxy Address**: `0x56B81A60Ae343342685911bd97D1331fF4fa2d29` (unchanged)
```

### Update apps/web/lib/contracts/addresses.ts

**NO CHANGES NEEDED** - Proxy addresses stay the same, only implementations change.

However, update `IMPLEMENTATION_ADDRESSES`:

```typescript
export const IMPLEMENTATION_ADDRESSES = {
  // ... other addresses
  ADVENTURER: '0x[ADVENTURER_NEW_IMPL]' as Address, // Only if upgraded
  TAVERNKEEPER: '0x[TAVERNKEEPER_NEW_IMPL]' as Address,
  // ...
};
```

## Checklist

### Pre-Deployment
- [ ] Verify Adventurer contract has `updateTokenURI` (check block explorer or test)
- [ ] Compile both contracts: `npx hardhat compile`
- [ ] Run tests: `npx hardhat test test/AdventurerMetadata.test.ts`
- [ ] Verify deployer wallet has sufficient MON for gas
- [ ] Backup current deployment info

### Deployment
- [ ] Upgrade Adventurer (if needed)
- [ ] Upgrade TavernKeeper
- [ ] Verify both contracts on block explorer
- [ ] Test `updateTokenURI` function on both contracts

### Post-Deployment
- [ ] Update `FIRSTDEPLOYMENT.md` with upgrade details
- [ ] Update `DEPLOYMENT_TRACKER.md` with new implementation addresses
- [ ] Update `apps/web/lib/contracts/addresses.ts` with new implementation addresses
- [ ] Verify frontend can call `updateTokenURI` on both contracts
- [ ] Commit all changes to git

## Important Notes

1. **Proxy Addresses Unchanged**: Both proxy addresses stay the same, only implementations change
2. **ABI Already Updated**: Frontend ABIs already have `updateTokenURI` added
3. **Backward Compatible**: Existing functionality remains unchanged
4. **Gas Costs**: Upgrading is a single transaction per contract, updating metadata is separate per NFT

## Rollback Plan

If issues occur:
1. Old implementations still exist at their addresses
2. Can upgrade proxies back to old implementations if needed
3. No state is lost - all NFT data remains intact

## Deployment Command Summary

```bash
cd packages/contracts

# Check Adventurer first (verify if updateTokenURI exists)
# If needed:
export CONTRACT_NAME=Adventurer
export PROXY_ADDRESS=0xb138Bf579058169e0657c12Fd9cc1267CAFcb935
npx hardhat run scripts/upgrade.ts --network monad

# Then TavernKeeper:
export CONTRACT_NAME=TavernKeeper
export PROXY_ADDRESS=0x56B81A60Ae343342685911bd97D1331fF4fa2d29
npx hardhat run scripts/upgrade.ts --network monad

# Verify both:
npx hardhat verify --network monad [ADVENTURER_NEW_IMPL]
npx hardhat verify --network monad [TAVERNKEEPER_NEW_IMPL]
```
