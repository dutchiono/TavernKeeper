# CellarZapV4 UUPS Conversion Checklist

## Pre-Conversion Analysis

- [ ] Review current CellarZapV4 contract structure
- [ ] Identify all state variables
- [ ] Document dependencies (CellarHook, PoolManager, MON, KEEP)
- [ ] Check if contract has any complex logic that might conflict with UUPS

## Contract Conversion

- [ ] Replace `@openzeppelin/contracts` imports with `@openzeppelin/contracts-upgradeable`
- [ ] Change `Ownable` to `OwnableUpgradeable`
- [ ] Add `Initializable`, `UUPSUpgradeable` imports
- [ ] Convert constructor to `initialize()` function
- [ ] Add `_disableInitializers()` in constructor
- [ ] Add `_authorizeUpgrade()` function with `onlyOwner` modifier
- [ ] Ensure all immutable variables are handled correctly (may need to change to regular state vars)

## State Variables to Initialize

- [ ] `poolManager` (IPoolManager) - currently immutable, needs to be state var
- [ ] `cellarHook` (address) - currently immutable, needs to be state var
- [ ] `MON` (Currency) - currently immutable, needs to be state var
- [ ] `KEEP` (Currency) - currently immutable, needs to be state var

## Function Updates

- [ ] Verify `mintLP()` function works with new structure
- [ ] Ensure `receive()` function is preserved
- [ ] Check that all external calls still work

## Testing

- [ ] Unit test: Contract initialization
- [ ] Unit test: `mintLP()` function works correctly
- [ ] Integration test: Can interact with CellarHook
- [ ] Integration test: Can interact with PoolManager
- [ ] Integration test: Token transfers work correctly

## Deployment Script

- [ ] Create `deploy_cellarzap_uups.ts` script
- [ ] Script deploys implementation contract
- [ ] Script deploys UUPS proxy
- [ ] Script initializes proxy with correct parameters (poolManager, cellarHook, MON, KEEP)
- [ ] Script updates deployment-info-v4.json
- [ ] Script updates frontend addresses

## Address Updates

- [ ] Update `apps/web/lib/contracts/addresses.ts` with new proxy address
- [ ] Update `packages/contracts/deployment-info-v4.json`
- [ ] Update `packages/contracts/DEPLOYMENT_TRACKER.md`
- [ ] Update contract registry in `apps/web/lib/contracts/registry.ts`

## Verification

- [ ] Verify contract compiles without errors
- [ ] Verify no storage layout conflicts
- [ ] Verify proxy address is correct
- [ ] Verify initialization parameters match old contract

## Notes

- Immutable variables cannot be used in upgradeable contracts - must convert to state variables
- Ensure CellarHook address is updated before deploying CellarZapV4
