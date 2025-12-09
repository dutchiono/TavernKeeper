# TheCellarV3 Withdrawal Fix - Upgrade Documentation

## Overview

This upgrade fixes critical withdrawal failures for users who created LP tokens via the ZAP (CellarZapV4). The issue was that the `withdraw()` function didn't properly check if the Uniswap V3 position had enough liquidity before attempting to decrease it.

## Problem

Users were experiencing withdrawal failures with error messages like:
- "Insufficient position liquidity"
- Transaction reverts when trying to withdraw LP tokens created via ZAP

### Root Causes

1. **Missing Position Liquidity Check**: The function only checked `totalLiquidity >= lpAmount` but didn't verify the actual Uniswap position liquidity. If CLP supply exceeded position liquidity (due to accounting mismatches), `decreaseLiquidity()` would fail.

2. **uint128 Overflow Risk**: Casting `lpAmount` to `uint128` without checking could cause silent overflow for very large amounts.

3. **Collect Amount Overflow**: When collecting fees, `amount0 + userFees0` could exceed `uint128.max`, causing the collect call to fail.

## Solution

### Changes Made to `TheCellarV3.sol`

1. **Added Position Liquidity Check** (lines 281-283):
   - Reads actual position liquidity from Uniswap before attempting withdrawal
   - Ensures position has liquidity available

2. **Added Max Withdrawable Calculation** (lines 285-288):
   - Calculates `maxWithdrawable = min(positionLiquidity, totalLiquidity)`
   - Prevents users from trying to withdraw more than what's actually available
   - Handles cases where CLP was minted incorrectly or liquidity was removed without burning CLP

3. **Added uint128 Overflow Protection** (line 291):
   - Checks `lpAmount <= type(uint128).max` before casting
   - Prevents overflow errors

4. **Added Collect Amount Overflow Protection** (lines 334-338):
   - Safely handles cases where collect amounts might exceed `uint128.max`
   - Caps amounts to `type(uint128).max` if needed

## Upgrade Process

### Pre-Upgrade Checklist

- [ ] Verify you're on the correct network (Mainnet: 143, Testnet: 10143)
- [ ] Verify deployer account is the owner of TheCellarV3 proxy
- [ ] Backup current state (pot balances, token ID, total liquidity)
- [ ] Ensure sufficient gas/MON for upgrade transaction

### Running the Upgrade

```bash
cd packages/contracts
npx hardhat run scripts/upgrade-cellar-withdraw-fix.ts --network monad
```

### What the Script Does

1. ✅ Verifies current state and backs up important data
2. ✅ Compiles and verifies the upgrade contract
3. ✅ Performs the upgrade (UUPS proxy pattern)
4. ✅ Verifies state preservation (pot balances, token ID, etc.)
5. ✅ Tests withdraw function logic (simulation)
6. ✅ Reports upgrade completion

### Post-Upgrade Verification

After upgrade, verify:
- [ ] Pot balances unchanged
- [ ] Token ID unchanged
- [ ] Total liquidity unchanged
- [ ] Owner unchanged
- [ ] Withdraw function works for small test amounts
- [ ] ZAP-created LP tokens can be withdrawn

## Testing

### Manual Testing Steps

1. **Small Withdrawal Test**:
   ```solidity
   // Test withdrawing a small amount (e.g., 0.1 CLP)
   await cellar.withdraw(ethers.parseEther("0.1"));
   ```

2. **Verify Position Liquidity Check**:
   - If position liquidity < totalLiquidity, users should only be able to withdraw up to position liquidity
   - Error message should be clear: "Insufficient position liquidity"

3. **Test with ZAP-Created LP**:
   - Create LP via CellarZapV4
   - Attempt to withdraw
   - Should succeed (previously failed)

## Deployment Tracking

After successful upgrade, update `DEPLOYMENT_TRACKER.md`:

```markdown
| TheCellarV3 | Impl | `[NEW_IMPL_ADDRESS]` | ✅ [DATE] | [TX_HASH] | v1.4.0 - Withdrawal Fix |
```

## Rollback Plan

If something goes wrong:

1. **State is preserved**: All pot balances, token IDs, etc. remain unchanged
2. **Old functions still work**: `addLiquidity()`, `harvest()`, `raid()` unchanged
3. **Emergency options**: `emergencyDrainPot()` still available if needed

## Important Notes

- ⚠️ **This is a critical fix**: Users were unable to withdraw LP tokens
- ✅ **Backward compatible**: No breaking changes, only adds safety checks
- ✅ **State preserving**: All existing state is preserved during upgrade
- ✅ **No initialization needed**: Upgrade is complete after deployment

## Support

If you encounter issues:
1. Check the transaction hash on block explorer
2. Verify the implementation address changed
3. Verify state was preserved (pot balances, etc.)
4. Test withdraw function with a small amount

## Network-Specific Notes

### Mainnet (Chain ID: 143)
- Proxy: `0x32A920be00dfCE1105De0415ba1d4f06942E9ed0`
- Use `--network monad` flag

### Testnet (Chain ID: 10143)
- Update `CELLAR_V3_PROXY` in script if different
- Use `--network monad-testnet` flag (if configured)

