# CellarHook UUPS Conversion Checklist

## Pre-Conversion Analysis

- [ ] Review current CellarHook contract structure
- [ ] Identify all state variables that need to be preserved
- [ ] Document all dependencies (TavernKeeper, CellarZapV4, PoolManager)
- [ ] Verify BaseHook compatibility with UUPS pattern
- [ ] Check Uniswap v4 hook address requirements (hook flags)

## Contract Conversion

- [ ] Replace `@openzeppelin/contracts` imports with `@openzeppelin/contracts-upgradeable`
- [ ] Change `ERC20` to `ERC20Upgradeable`
- [ ] Add `Initializable`, `OwnableUpgradeable`, `UUPSUpgradeable` imports
- [ ] Convert constructor to `initialize()` function
- [ ] Add `_disableInitializers()` in constructor
- [ ] Add `_authorizeUpgrade()` function with `onlyOwner` modifier
- [ ] Fix `receive()` function to update `potBalance` when funds arrive
- [ ] Ensure all state variables are properly initialized
- [ ] Verify `slot0` struct initialization
- [ ] Test that hook permissions are preserved

## State Variables to Initialize

- [ ] `potBalance` (uint256) - initialize to 0
- [ ] `MON` (Currency) - immutable, set in initialize
- [ ] `KEEP` (Currency) - immutable, set in initialize
- [ ] `epochPeriod` (uint256) - immutable, set in initialize
- [ ] `priceMultiplier` (uint256) - immutable, set in initialize
- [ ] `minInitPrice` (uint256) - immutable, set in initialize
- [ ] `slot0` (Slot0 struct) - initialize with proper values
- [ ] `lastTradeBlock` mapping - starts empty

## Hook Compatibility

- [ ] Verify `getHookPermissions()` still works correctly
- [ ] Ensure hook address flags are still valid (if using Create2)
- [ ] Test that BaseHook inheritance works with UUPS
- [ ] Verify hook callbacks (beforeSwap, afterSwap, etc.) function correctly

## Testing

- [ ] Unit test: Contract initialization
- [ ] Unit test: `receive()` updates `potBalance` correctly
- [ ] Unit test: `raid()` function works with updated `potBalance`
- [ ] Unit test: Hook permissions are correct
- [ ] Integration test: TavernKeeper can send funds to CellarHook
- [ ] Integration test: CellarZapV4 can interact with CellarHook
- [ ] Integration test: PoolManager integration works

## Deployment Script

- [ ] Create `deploy_cellarhook_uups.ts` script
- [ ] Script deploys implementation contract
- [ ] Script deploys UUPS proxy
- [ ] Script initializes proxy with correct parameters
- [ ] Script updates TavernKeeper treasury address
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
- [ ] Test that existing state is accessible (if migrating)

## Notes

- **CRITICAL**: The `receive()` function MUST update `potBalance` or `raid()` will send 0 rewards
- Hook address requirements may need to be re-evaluated if using Create2Factory
- Consider if we need to migrate existing `potBalance` from old contract
