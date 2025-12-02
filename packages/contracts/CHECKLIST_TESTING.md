# Testing and Validation Checklist

## Unit Tests

### CellarHook Tests

- [ ] Test contract initialization
- [ ] Test `receive()` function updates `potBalance` correctly
- [ ] Test `raid()` function reads `potBalance` and sends correct amount
- [ ] Test `raid()` resets `potBalance` to 0 after sending
- [ ] Test hook permissions are correct
- [ ] Test `getAuctionPrice()` function
- [ ] Test `slot0` struct updates correctly
- [ ] Test reentrancy protection works

### CellarZapV4 Tests

- [ ] Test contract initialization
- [ ] Test `mintLP()` function
- [ ] Test token transfers
- [ ] Test interaction with CellarHook
- [ ] Test interaction with PoolManager

## Integration Tests

- [ ] Test TavernKeeper sends fees to CellarHook
- [ ] Test CellarHook `receive()` updates `potBalance` when receiving from TavernKeeper
- [ ] Test CellarZapV4 can call CellarHook functions
- [ ] Test PoolManager integration with CellarHook
- [ ] Test full flow: Take Office -> Fees sent -> potBalance updates -> Raid works

## Frontend Integration Tests

- [ ] Test `theCellarService.getCellarState()` reads correct data
- [ ] Test `theCellarService.claim()` executes raid correctly
- [ ] Test UI displays potBalance correctly
- [ ] Test UI displays prices correctly
- [ ] Test raid button works and executes transaction
- [ ] Test that transactions show correct status

## End-to-End Tests

- [ ] Full flow: User takes office -> Fees accumulate -> User raids cellar -> Receives rewards
- [ ] Test with multiple users
- [ ] Test with multiple office changes
- [ ] Test that potBalance accumulates correctly over time
- [ ] Test that raid resets potBalance and starts new epoch

## Bug Fix Verification

- [ ] **CRITICAL**: Send MON to CellarHook directly
- [ ] Verify `potBalance` increases
- [ ] Verify native balance matches `potBalance`
- [ ] Execute `raid()` and verify correct amount is sent
- [ ] Verify `potBalance` resets to 0 after raid

## Performance Tests

- [ ] Test gas costs for key functions
- [ ] Test contract read performance
- [ ] Test contract write performance
- [ ] Compare gas costs before/after upgrade (if applicable)

## Security Tests

- [ ] Test reentrancy protection
- [ ] Test access control (onlyOwner functions)
- [ ] Test input validation
- [ ] Test overflow/underflow protection
- [ ] Test that unauthorized users cannot call restricted functions

## Regression Tests

- [ ] Verify all existing functionality still works
- [ ] Test that no features broke during conversion
- [ ] Test that all UI components still function
- [ ] Test that all service functions still work

## Notes

- Focus on verifying the potBalance bug is fixed
- Ensure no state is lost during conversion
- Verify all contract interactions still work
- Test both read and write operations
