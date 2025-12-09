# TheCellarV3 Dutch Auction Upgrade - Safety Checklist

## ⚠️ CRITICAL: Read This Before Upgrading

This upgrade adds Dutch auction functionality to TheCellarV3. Follow these steps carefully to avoid breaking anything.

## Pre-Upgrade Checklist

### 1. Verify Environment
- [ ] You're on the correct network (Mainnet: 143, Testnet: 10143)
- [ ] You have the correct private key/deployer account
- [ ] The deployer account is the owner of TheCellarV3 proxy
- [ ] You have sufficient gas/MON for the upgrade transaction

### 2. Backup Current State
Before upgrading, record these values:
- [ ] Pot Balance MON: `await cellar.potBalanceMON()`
- [ ] Pot Balance KEEP: `await cellar.potBalanceKEEP()`
- [ ] Token ID: `await cellar.tokenId()`
- [ ] Owner: `await cellar.owner()`
- [ ] Current Implementation: `await upgrades.erc1967.getImplementationAddress(PROXY)`

### 3. Verify Contract State
- [ ] Contract is functioning normally
- [ ] No pending critical transactions
- [ ] Users are aware of the upgrade (if needed)

## Upgrade Process

### Step 1: Review Parameters
The upgrade script uses these default parameters:
- **Init Price**: 100 CLP tokens
- **Epoch Period**: 3600 seconds (1 hour)
- **Price Multiplier**: 2x (doubles initPrice each epoch)
- **Min Init Price**: 1 CLP (floor price)

**Adjust these in the script if needed before running!**

### Step 2: Run Upgrade Script
```bash
cd packages/contracts
npx hardhat run scripts/upgrade-cellar-dutch-auction.ts --network monad
```

### Step 3: Monitor Upgrade
The script will:
1. ✅ Verify current state
2. ✅ Backup important data
3. ✅ Perform upgrade
4. ✅ Verify state preservation
5. ✅ Initialize auction parameters
6. ✅ Test new functions

## Post-Upgrade Verification

### 1. Verify State Preservation
Check that these values match your backups:
- [ ] Pot Balance MON unchanged
- [ ] Pot Balance KEEP unchanged
- [ ] Token ID unchanged
- [ ] Owner unchanged

### 2. Test New Functions
- [ ] `getAuctionPrice()` returns a valid price
- [ ] `slot0()` returns epoch data
- [ ] `epochPeriod`, `priceMultiplier`, `minInitPrice` are set correctly

### 3. Test raid() Function
**⚠️ IMPORTANT**: After upgrade, `raid()` will require:
- Bid must be >= current auction price
- Price will decay over time
- New epoch price = initPrice * 2 (not paid price * 2)

Test with a small amount first!

## What Changes

### Before Upgrade
- `raid()` accepts any `lpBid > 0`
- No price calculation
- No epoch tracking

### After Upgrade
- `raid()` requires `lpBid >= currentPrice`
- Price decays from `initPrice` to `minInitPrice` over `epochPeriod`
- New epoch starts at `initPrice * priceMultiplier`
- Price grows over time even if raided at floor

## Rollback Plan

If something goes wrong:

1. **State is preserved**: All pot balances, token IDs, etc. remain unchanged
2. **Old functions still work**: `addLiquidity()`, `withdraw()`, `harvest()` unchanged
3. **Emergency drain**: `emergencyDrainPot()` still available if needed

## Important Notes

- ⚠️ **Once auction is initialized, it cannot be re-initialized**
- ⚠️ **Auction parameters cannot be changed after initialization**
- ⚠️ **Price multiplier uses `initPrice`, not paid price** (ensures growth)
- ✅ **All existing functionality preserved**
- ✅ **No breaking changes to existing functions**

## Support

If you encounter issues:
1. Check the transaction hash on block explorer
2. Verify the implementation address changed
3. Check that `initializeAuction()` was called successfully
4. Verify `getAuctionPrice()` returns expected values

## Network-Specific Notes

### Mainnet (Chain ID: 143)
- Proxy: `0x32A920be00dfCE1105De0415ba1d4f06942E9ed0`
- Use `--network monad` flag

### Testnet (Chain ID: 10143)
- Update `CELLAR_V3_PROXY` in script if different
- Use `--network monad-testnet` flag (if configured)

