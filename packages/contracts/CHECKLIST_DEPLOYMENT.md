# Deployment Execution Checklist

## Pre-Deployment

- [ ] Verify all contracts compile successfully
- [ ] Verify all tests pass
- [ ] Review deployment scripts for correctness
- [ ] Ensure sufficient gas/MON balance in deployer wallet
- [ ] Backup current deployment-info-v4.json
- [ ] Backup current addresses.ts file
- [ ] Document current contract addresses

## Deployment Order (CRITICAL)

1. **CellarHook** (must be first - other contracts depend on it)
2. **CellarZapV4** (depends on CellarHook)
3. **Update TavernKeeper treasury** (points to CellarHook)

## CellarHook Deployment

- [ ] Run `npx hardhat run scripts/deploy_cellarhook_uups.ts --network monad`
- [ ] Verify implementation contract deployed
- [ ] Verify proxy contract deployed
- [ ] Verify proxy initialized correctly
- [ ] Verify hook address flags are correct (if applicable)
- [ ] Test that contract functions work
- [ ] Record implementation address
- [ ] Record proxy address
- [ ] Record transaction hashes

## CellarZapV4 Deployment

- [ ] Run `npx hardhat run scripts/deploy_cellarzap_uups.ts --network monad`
- [ ] Verify implementation contract deployed
- [ ] Verify proxy contract deployed
- [ ] Verify proxy initialized with correct CellarHook address
- [ ] Test that contract functions work
- [ ] Record implementation address
- [ ] Record proxy address
- [ ] Record transaction hashes

## TavernKeeper Treasury Update

- [ ] Run script to update TavernKeeper treasury address
- [ ] OR manually call `setTreasury(newCellarHookAddress)` on TavernKeeper
- [ ] Verify treasury address updated correctly
- [ ] Test that fees are sent to new CellarHook
- [ ] Record transaction hash

## Post-Deployment Updates

- [ ] Update `deployment-info-v4.json` with new addresses
- [ ] Update `apps/web/lib/contracts/addresses.ts`
- [ ] Update `apps/web/lib/contracts/registry.ts`
- [ ] Update `DEPLOYMENT_TRACKER.md`
- [ ] Commit all changes to git

## Verification

- [ ] Verify all proxy addresses are correct
- [ ] Verify all implementation addresses are correct
- [ ] Test that contracts are accessible at proxy addresses
- [ ] Test that potBalance bug is fixed (send MON, check potBalance updates)
- [ ] Test that raid() function works correctly
- [ ] Test that frontend can read contract state
- [ ] Test that frontend can execute transactions

## Rollback Plan

- [ ] Document old contract addresses
- [ ] Keep old deployment scripts
- [ ] If issues occur, can revert frontend addresses to old contracts
- [ ] Note: Old contracts still exist, just not receiving new funds

## Notes

- **DO NOT DELETE OLD CONTRACTS** - they may have funds or state
- Old CellarHook has ~0.15 MON that won't be tracked by potBalance
- New contracts start fresh - no state migration needed
- All new funds will go to new contracts
