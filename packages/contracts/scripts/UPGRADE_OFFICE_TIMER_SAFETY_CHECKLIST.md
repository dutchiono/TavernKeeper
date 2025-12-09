# Office Timer Fix Upgrade - Safety Checklist

## ⚠️ CRITICAL: Read This Before Upgrading

This upgrade fixes a bug where the office timer (`startTime`) was being reset when claiming rewards, which broke:
1. **Dutch auction price calculation** - Price was resetting incorrectly
2. **Miner tenure timer** - Showed wrong time since taking office

## Pre-Upgrade Checklist

### 1. Verify Environment
- [ ] You're on the correct network (Mainnet: 143, Testnet: 10143)
- [ ] You have the correct private key/deployer account
- [ ] The deployer account is the owner of TavernKeeper proxy
- [ ] You have sufficient gas/MON for the upgrade transaction

### 2. Backup Current State
Before upgrading, record these values:
- [ ] Current Manager: `await contract.slot0().miner`
- [ ] Start Time: `await contract.slot0().startTime`
- [ ] Epoch ID: `await contract.slot0().epochId`
- [ ] Current Price: `await contract.getPrice()`
- [ ] Pending Rewards: `await contract.getPendingOfficeRewards()`
- [ ] Current Implementation: `await upgrades.erc1967.getImplementationAddress(PROXY)`

### 3. Verify Contract State
- [ ] Contract is functioning normally
- [ ] No pending critical transactions
- [ ] Current manager (if any) is aware of the upgrade

## Upgrade Process

### Step 1: Review Changes
The upgrade adds:
- **New storage variable**: `officeLastClaimTime` (uint40) added AFTER existing storage (initializes to 0)
- **Updated**: `claimOfficeRewards()` - uses `officeLastClaimTime` instead of resetting `startTime`
- **Updated**: `getPendingOfficeRewards()` - uses `officeLastClaimTime` if set
- **Updated**: `takeOffice()` - resets `officeLastClaimTime` to 0 for new manager
- **Note**: Slot0 struct is UNCHANGED (storage layout compatible)

### Step 2: Run Upgrade Script
```powershell
cd packages/contracts
npx hardhat run scripts/upgrade-office-timer-fix.ts --network monad
```

The script will:
1. ✅ Check current office state
2. ✅ Backup important data
3. ✅ Perform upgrade
4. ✅ Verify state preservation
5. ✅ Test new functions

## Post-Upgrade Verification

### 1. Verify State Preservation
Check that these values match your backups:
- [ ] Manager unchanged
- [ ] Start Time unchanged (critical!)
- [ ] Epoch ID unchanged
- [ ] Price calculation still works

### 2. Test New Behavior

**For Current Manager (if exists):**
- [ ] `officeLastClaimTime` should be 0 (default)
- [ ] First claim after upgrade should use `startTime` (gets all rewards since taking office)
- [ ] `startTime` should NOT change when claiming
- [ ] Subsequent claims should use `officeLastClaimTime` (incremental)

**For Auction Price:**
- [ ] Price should continue to decay correctly
- [ ] Price should NOT reset when manager claims rewards
- [ ] Price calculation uses `startTime` (unchanged)

**Test Commands:**
```typescript
// Check slot0 structure (unchanged)
const slot0 = await contract.slot0();
console.log("startTime:", slot0.startTime);

// Check officeLastClaimTime (separate storage variable)
const lastClaimTime = await contract.officeLastClaimTime();
console.log("officeLastClaimTime:", lastClaimTime); // Should be 0 initially

// Check price (should not reset on claim)
const priceBefore = await contract.getPrice();
// ... manager claims rewards ...
const priceAfter = await contract.getPrice();
// priceAfter should continue from priceBefore (not reset)

// Check pending rewards
const rewards = await contract.getPendingOfficeRewards();
// Should show rewards since startTime (if officeLastClaimTime = 0)
```

### 3. Monitor First Claim
After upgrade, when current manager claims:
- [ ] They should receive ALL rewards since taking office (not just since last claim)
- [ ] `lastClaimTime` should be set to current timestamp
- [ ] `startTime` should remain unchanged
- [ ] Price calculation should continue correctly

## What Changed

### Before (Bug):
- `claimOfficeRewards()` reset `startTime` to `block.timestamp`
- This broke auction price calculation
- This broke miner tenure timer

### After (Fixed):
- `claimOfficeRewards()` updates `officeLastClaimTime` (separate storage variable) to `block.timestamp`
- `startTime` remains fixed from when they took office (never changes)
- Auction price uses `startTime` (correct)
- Rewards use `officeLastClaimTime` if set, otherwise `startTime` (correct)

## Rollback Plan

If something goes wrong:
1. The proxy address stays the same
2. You can upgrade again with previous implementation
3. State is preserved (no data loss)

## Important Notes

- **No data loss**: All existing state is preserved
- **Backward compatible**: Old behavior still works (officeLastClaimTime = 0 uses startTime)
- **Current manager safe**: First claim after upgrade gets all rewards since taking office
- **Storage layout**: Adding new variable AFTER existing storage is safe (doesn't modify struct)

## Support

If you encounter issues:
1. Check the upgrade script output for errors
2. Verify state preservation using the test commands above
3. Check that `startTime` was NOT changed during upgrade
4. Verify `officeLastClaimTime` is 0 for current manager
5. Verify Slot0 struct was NOT modified (storage layout compatibility)

