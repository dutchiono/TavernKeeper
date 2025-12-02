# Contract Integration Tests

⚠️ **WARNING: These tests make REAL contract calls and may cost money or require testnet setup**

## Excluded Tests

The following test files are **EXCLUDED from the default test run** because they make real blockchain calls:

- `__tests__/services/tavernKeeperService.test.ts` - Makes real contract calls to testnet

## Running Contract Tests (Optional)

If you want to run contract integration tests, you need:

1. **Testnet Setup**:
   - Testnet wallets in `packages/contracts/wallets/testnet-keys.json`
   - `NEXT_PUBLIC_MONAD_RPC_URL` environment variable set
   - Contracts deployed on testnet

2. **Run Specific Test**:
   ```bash
   pnpm test __tests__/services/tavernKeeperService.test.ts
   ```

3. **Or temporarily remove from exclude list** in `vitest.config.ts`

## Default Test Suite

By default, `pnpm test` runs **ONLY mocked tests** that:
- ✅ Test API route handlers
- ✅ Test business logic
- ✅ Use mocked services (no real calls)
- ✅ Cost nothing
- ✅ Run fast

All tests in `__tests__/api/` are safe and fully mocked.
