# UUPS Conversion Notes

## Overview

This document details the conversion of `CellarHook` and `CellarZapV4` from non-upgradeable contracts to UUPS (Universal Upgradeable Proxy Standard) upgradeable contracts. This conversion was necessary to:
1. Fix the critical `potBalance` bug in `CellarHook`
2. Enable future contract upgrades without redeployment
3. Maintain compatibility with Uniswap v4 hook requirements

## Critical Bug Fixed

### The Problem
The original `CellarHook` contract had an empty `receive()` function:
```solidity
receive() external payable {}
```

When `TavernKeeper` sent fees to `CellarHook` via `treasury.transfer()`, the native MON balance increased but `potBalance` (a state variable) was never updated. This caused `raid()` to calculate rewards as 0, even though the contract held funds.

### The Fix
The `receive()` function now updates `potBalance`:
```solidity
receive() external payable {
    if (Currency.unwrap(MON) == address(0) && msg.value > 0) {
        potBalance += msg.value;
    }
}
```

This ensures that when native MON is sent to the contract, `potBalance` tracks the accumulated fees correctly.

## CellarHook Conversion

### Original Architecture
- Inherited from Uniswap v4's `BaseHook` (which inherits from `ImmutableState`)
- Inherited from `ERC20`
- Used `Ownable` for access control
- Had `immutable` variables: `poolManager`, `MON`, `KEEP`, `epochPeriod`, `priceMultiplier`, `minInitPrice`
- Deployed via `Create2Factory` for deterministic address (hook flags requirement)

### Why BaseHook Was Incompatible
`BaseHook` inherits from `ImmutableState`, which sets `poolManager` as an `immutable` variable in its constructor:
```solidity
constructor(IPoolManager _poolManager) {
    poolManager = _poolManager; // immutable assignment
}
```

UUPS upgradeable contracts cannot use constructors for initialization. They must use `initialize()` functions instead. However, `immutable` variables can only be set in constructors, creating a fundamental incompatibility.

### New Architecture
- **Removed `BaseHook` inheritance** - Now directly implements `IHooks` interface
- **Replaced `ERC20` with `ERC20Upgradeable`**
- **Replaced `Ownable` with `OwnableUpgradeable`**
- **Added `UUPSUpgradeable` and `Initializable`**
- **Converted all `immutable` variables to state variables**:
  - `poolManager` → `IPoolManager public poolManager`
  - `MON`, `KEEP` → `Currency public MON/KEEP`
  - `epochPeriod`, `priceMultiplier`, `minInitPrice` → state variables
- **Replaced constructor with `initialize()` function**
- **Added `_authorizeUpgrade()` function** for upgrade authorization

### Hook Implementation
Since we no longer inherit from `BaseHook`, we manually implement all required `IHooks` functions:
- `beforeAddLiquidity()` - Returns `selector` (required by hook flags)
- `afterAddLiquidity()` - Reverts with `HookNotImplemented`
- `beforeRemoveLiquidity()` - Returns `selector`
- `afterRemoveLiquidity()` - Reverts with `HookNotImplemented`
- `beforeSwap()` - Returns `selector`
- `afterSwap()` - Implements anti-sandwich protection and epoch logic
- `beforeDonate()` - Reverts with `HookNotImplemented`
- `afterDonate()` - Reverts with `HookNotImplemented`

### Custom Modifier
Since `BaseHook` provided `onlyPoolManager` modifier, we implemented our own:
```solidity
modifier onlyPoolManager() {
    if (msg.sender != address(poolManager)) {
        revert NotPoolManager();
    }
    _;
}
```

### Hook Address Requirements
**IMPORTANT**: The original `CellarHook` was deployed via `Create2Factory` to achieve a specific address that matches Uniswap v4's hook flag requirements. The new UUPS proxy will have a **different address**.

**Action Required**: Verify that the new proxy address still meets hook flag requirements, or update the pool configuration if necessary.

## CellarZapV4 Conversion

### Original Architecture
- Inherited from `Ownable`
- Had `immutable` variables: `poolManager`, `cellarHook`, `MON`, `KEEP`
- Simple contract that facilitates LP minting

### New Architecture
- **Replaced `Ownable` with `OwnableUpgradeable`**
- **Added `UUPSUpgradeable` and `Initializable`**
- **Converted all `immutable` variables to state variables**
- **Replaced constructor with `initialize()` function**
- **Added `_authorizeUpgrade()` function**

### Dependencies
`CellarZapV4` depends on `CellarHook`. When deploying, ensure:
1. `CellarHook` UUPS proxy is deployed first
2. `CellarZapV4` is initialized with the new `CellarHook` proxy address (not the old direct address)

## State Migration Considerations

### CellarHook State
The following state exists in the old contract and needs to be considered:
- `potBalance` - Currently ~0.15 MON in old contract (will be lost if not migrated)
- `slot0` - Auction state (epochId, initPrice, startTime, locked)
- `lastTradeBlock` - Anti-sandwich protection mapping

**Migration Strategy**:
- New contract starts with fresh state (potBalance = 0, new epoch)
- Old contract's funds (~0.15 MON) are effectively lost unless manually recovered
- Users will need to interact with new contract for future operations

### CellarZapV4 State
This contract has no persistent state, so no migration is needed.

## Deployment Scripts

### `deploy_cellarhook_uups.ts`
1. Deploys `CellarHook` implementation contract
2. Deploys UUPS proxy and initializes it
3. Verifies deployment (checks `potBalance`, `slot0`, `poolManager`)
4. Updates `TavernKeeper.treasury` to point to new proxy
5. Updates `deployment-info-v4.json` and frontend addresses

**Key Parameters**:
- `initPrice`: 100 MON (ethers.parseEther("100"))
- `epochPeriod`: 3600 seconds (1 hour)
- `priceMultiplier`: 1.1e18 (110%)
- `minInitPrice`: 1 MON
- `MON`: address(0) (native token)

### `deploy_cellarzap_uups.ts`
1. Deploys `CellarZapV4` implementation contract
2. Deploys UUPS proxy and initializes it
3. Verifies deployment (checks `poolManager`, `cellarHook`)
4. Updates `deployment-info-v4.json` and frontend addresses

**Dependencies**: Requires `CellarHook` proxy address to be deployed first.

## Frontend Updates

### Contract Registry (`apps/web/lib/contracts/registry.ts`)
Updated entries for:
- `THECELLAR` (CellarHook):
  - Changed `directAddress` → `proxyAddress`
  - Changed `proxyType` from `'None'` → `'UUPS'`
  - Added `poolManager` to ABI and `requiredFunctions`
- `CELLAR_ZAP`:
  - Changed `directAddress` → `proxyAddress`
  - Changed `proxyType` from `'None'` → `'UUPS'`

### Service Files
All service files that reference `CellarHook` or `CellarZapV4` addresses should automatically use the new proxy addresses from `addresses.ts` after running `updateFrontendAddresses()`.

## Important Notes

### 1. Old Contract Still Exists
The old non-upgradeable `CellarHook` at `0x41ceC2cE651D37830af8FD94a35d23d428F80aC0` still exists and contains ~0.15 MON. This is effectively lost unless manually recovered.

### 2. Hook Address Change
The new UUPS proxy will have a different address than the original `Create2Factory`-deployed contract. Verify hook flag compatibility.

### 3. No State Migration
The new contracts start with fresh state. No automatic migration of existing state (potBalance, slot0, etc.) is performed.

### 4. Deployment Order
1. Deploy `CellarHook` UUPS proxy first
2. Update `TavernKeeper.treasury` to new `CellarHook` address
3. Deploy `CellarZapV4` UUPS proxy with new `CellarHook` address
4. Update frontend addresses

### 5. Testing Requirements
Before considering this complete:
- [ ] Verify `receive()` updates `potBalance` correctly
- [ ] Test `raid()` function with new `potBalance` tracking
- [ ] Verify hook callbacks work correctly (afterSwap, etc.)
- [ ] Test `CellarZapV4.mintLP()` with new `CellarHook`
- [ ] Verify `TavernKeeper` can send fees to new `CellarHook`
- [ ] Test frontend integration with new proxy addresses

## Storage Layout Compatibility

For future upgrades, maintain storage layout compatibility:
- **Never remove or reorder state variables**
- **Only append new state variables at the end**
- **Never change types of existing state variables**
- **Use storage gaps if removing variables is necessary**

Current storage layout (CellarHook):
1. `poolManager` (address)
2. `MON` (Currency)
3. `KEEP` (Currency)
4. `potBalance` (uint256)
5. `lastTradeBlock` (mapping)
6. `epochPeriod` (uint256)
7. `priceMultiplier` (uint256)
8. `minInitPrice` (uint256)
9. `slot0` (Slot0 struct)

## Deployment Checklist

Before deploying:
- [ ] Review all contract changes
- [ ] Verify `receive()` function fix
- [ ] Check hook flag compatibility
- [ ] Prepare deployment parameters
- [ ] Have sufficient gas for deployment
- [ ] Backup current deployment info
- [ ] Test on testnet first (if available)

After deploying:
- [ ] Verify proxy addresses in deployment-info-v4.json
- [ ] Verify frontend addresses updated
- [ ] Test contract interactions
- [ ] Monitor for any issues
- [ ] Update DEPLOYMENT_TRACKER.md
- [ ] Document any issues encountered

## Questions & Answers

### Q: Why not just fix the `receive()` function in the old contract?
**A**: The old contract is not upgradeable, so we cannot modify it. We must deploy a new contract.

### Q: Why remove `BaseHook` inheritance instead of making it compatible?
**A**: `BaseHook` uses `immutable` variables which are fundamentally incompatible with upgradeable contracts. Making `BaseHook` upgradeable would require modifying Uniswap v4 core contracts, which we cannot do.

### Q: What happens to the old contract's funds?
**A**: The ~0.15 MON in the old contract is effectively lost unless manually recovered by the deployer. The new contract starts with `potBalance = 0`.

### Q: Can we migrate state from the old contract?
**A**: Not automatically. The old contract's state (potBalance, slot0) cannot be read by the new contract. If migration is needed, it would require a manual script to read old state and initialize new contract accordingly.

### Q: Will the hook address change affect the pool?
**A**: Potentially. Uniswap v4 pools are configured with a specific hook address. If the hook address changes, the pool configuration may need to be updated. Verify hook flag compatibility.

## References

- [OpenZeppelin UUPS Documentation](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies#uups-proxies)
- [Uniswap v4 Hooks Documentation](https://docs.uniswap.org/contracts/v4/overview/hooks)
- [Storage Layout Compatibility](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable#storage-gaps)
