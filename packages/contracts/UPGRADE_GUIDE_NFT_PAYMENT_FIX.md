# NFT Contract Upgrade Guide: Payment Fix + Whitelist

## Overview

This guide documents the upgrade process for TavernKeeper and Adventurer contracts to:
1. Fix payment handling (transfer Mon to treasury instead of accumulating)
2. Add withdrawal functions for stuck funds
3. Add whitelist functionality for free mints

## Pre-Upgrade Checklist

- [ ] Review contract changes in `TavernKeeper.sol` and `Adventurer.sol`
- [ ] Run `check_tavernkeeper_balance.ts` to check for stuck funds
- [ ] Verify you have upgrade permissions (owner of proxy)
- [ ] Ensure sufficient MON balance for gas
- [ ] Backup current implementation addresses

## Upgrade Process

### Step 1: Check Current State

```powershell
# Check for stuck funds
npx hardhat run scripts/check_tavernkeeper_balance.ts --network monad
```

This will show:
- Current MON balances in both contracts
- Treasury configuration
- Whether funds need to be recovered

### Step 2: Run Upgrade Script

```powershell
# Upgrade both contracts
npx hardhat run scripts/upgrade_nft_payment_fix.ts --network monad
```

The script will:
1. Check for stuck funds
2. Get current implementation addresses
3. Upgrade TavernKeeper
4. Upgrade Adventurer
5. Verify new functions exist
6. Provide documentation update commands

### Step 3: Set Adventurer Treasury (if needed)

After upgrade, if Adventurer treasury is not set:

```typescript
// In a script or via hardhat console
const adventurer = await ethers.getContractAt("Adventurer", "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935");
await adventurer.setTreasury("0x..."); // Use same treasury as TavernKeeper or deployer
```

### Step 4: Withdraw Stuck Funds (if any)

If contracts had stuck funds before upgrade:

```typescript
// TavernKeeper
const tk = await ethers.getContractAt("TavernKeeper", "0x56B81A60Ae343342685911bd97D1331fF4fa2d29");
await tk.withdrawFunds();

// Adventurer
const adv = await ethers.getContractAt("Adventurer", "0xb138Bf579058169e0657c12Fd9cc1267CAFcb935");
await adv.withdrawFunds();
```

### Step 5: Update Documentation

Run the commands provided by the upgrade script to update:
- `FIRSTDEPLOYMENT.md` - Upgrade history
- `DEPLOYMENT_TRACKER.md` - Implementation addresses
- `apps/web/lib/contracts/addresses.ts` - IMPLEMENTATION_ADDRESSES

Example (PowerShell):
```powershell
# TavernKeeper
$env:CONTRACT_NAME="TavernKeeper"
$env:OLD_IMPL="0x[OLD]"
$env:NEW_IMPL="0x[NEW]"
$env:REASON="Fixed mint payment transfer to treasury, added withdrawFunds(), added whitelist functionality"
npx hardhat run scripts/update_deployment_docs.ts

# Adventurer
$env:CONTRACT_NAME="Adventurer"
$env:OLD_IMPL="0x[OLD]"
$env:NEW_IMPL="0x[NEW]"
$env:REASON="Fixed mint payment transfer to treasury, added treasury support, added withdrawFunds(), added whitelist functionality"
npx hardhat run scripts/update_deployment_docs.ts
```

### Step 6: Verify Upgrade

1. Test minting to verify payments go to treasury
2. Test whitelist functions (add/remove addresses)
3. Test whitelist minting (free mint)
4. Verify withdrawFunds() works if needed

## Contract Changes Summary

### TavernKeeper.sol
- ✅ `mintTavernKeeper()` now transfers `msg.value` to treasury (or owner if treasury not set)
- ✅ Added `withdrawFunds()` function for owner to recover stuck funds
- ✅ Added `whitelist` and `whitelistMinted` mappings
- ✅ Added `addToWhitelist()`, `removeFromWhitelist()`, `addToWhitelistBatch()`
- ✅ Added `mintTavernKeeperWhitelist()` for free mints

### Adventurer.sol
- ✅ `mintHero()` now transfers `msg.value` to treasury (or owner if treasury not set)
- ✅ Added `treasury` storage variable
- ✅ Added `setTreasury()` function
- ✅ Added `withdrawFunds()` function for owner to recover stuck funds
- ✅ Added `whitelist` and `whitelistMinted` mappings
- ✅ Added `addToWhitelist()`, `removeFromWhitelist()`, `addToWhitelistBatch()`
- ✅ Added `mintHeroWhitelist()` for free mints

## Post-Upgrade Tasks

- [ ] Update `DEPLOYMENT_TRACKER.md` with new implementation addresses
- [ ] Update `FIRSTDEPLOYMENT.md` upgrade history
- [ ] Update `apps/web/lib/contracts/addresses.ts` IMPLEMENTATION_ADDRESSES
- [ ] Set Adventurer treasury if needed
- [ ] Withdraw any stuck funds
- [ ] Test minting to verify payment flow
- [ ] Add whitelist addresses if needed
- [ ] Test whitelist minting

## Network-Specific Addresses

### Monad Mainnet (Chain ID: 143)
- TavernKeeper Proxy: `0x56B81A60Ae343342685911bd97D1331fF4fa2d29`
- Adventurer Proxy: `0xb138Bf579058169e0657c12Fd9cc1267CAFcb935`

### Monad Testnet (Chain ID: 10143)
- TavernKeeper Proxy: `0xFaC0786eF353583FBD43Ee7E7e84836c1857A381`
- Adventurer Proxy: `0x4Fff2Ce5144989246186462337F0eE2C086F913E`

## Troubleshooting

### Upgrade Fails with Storage Layout Error
- Check that storage variables are added at the end (after existing variables)
- Verify no existing storage slots are being reused

### Treasury Not Set After Upgrade
- Adventurer treasury is new - must be set manually after upgrade
- Use `setTreasury()` function with same address as TavernKeeper treasury (or deployer)

### Stuck Funds After Upgrade
- Use `withdrawFunds()` function (owner only)
- Funds will go to treasury if set, otherwise to owner

## Related Files

- `packages/contracts/contracts/TavernKeeper.sol` - Contract code
- `packages/contracts/contracts/Adventurer.sol` - Contract code
- `packages/contracts/scripts/upgrade_nft_payment_fix.ts` - Upgrade script
- `packages/contracts/scripts/check_tavernkeeper_balance.ts` - Balance check script
- `packages/contracts/scripts/update_deployment_docs.ts` - Documentation updater
- `FIRSTDEPLOYMENT.md` - Deployment history
- `packages/contracts/DEPLOYMENT_TRACKER.md` - Contract tracking

