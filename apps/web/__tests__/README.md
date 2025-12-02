# Test Suite Organization

## Test Categories

### ✅ Safe Tests (No Contract Calls)
All tests in `__tests__/api/` are **fully mocked** and will NOT make any real contract calls or spend any money. They test:
- API route handlers
- Request/response validation
- Error handling
- Business logic

These tests mock all external dependencies:
- `@/lib/services/*` - All service functions are mocked
- `@/lib/wallet/testnetWallet` - Wallet creation is mocked
- `viem` - Blockchain client is mocked
- `fetch` - HTTP calls are mocked

### ⚠️ Contract Integration Tests (Separate Suite)
Tests that would interact with contracts are in separate files and are **NOT RUN** by default:
- `__tests__/services/tavernKeeperService.test.ts` - May make real calls if not properly mocked
- Any test that imports actual contract services without mocking

## Running Tests

### Run All Safe Tests (Default)
```bash
pnpm test
```

This runs all tests in `__tests__/` which are fully mocked and safe.

### Run Specific Test Files
```bash
pnpm test __tests__/api/marketplace-list.test.ts
```

## Test Safety Guarantees

1. **All API route tests are mocked** - They test route handlers, not actual contract interactions
2. **No real network calls** - `fetch`, `viem`, and all blockchain clients are mocked
3. **No wallet operations** - All wallet functions return mock data
4. **No transaction costs** - No real transactions are sent

## Adding New Tests

When adding new tests:

1. **Always mock external dependencies**:
   ```typescript
   vi.mock('@/lib/services/marketplace');
   vi.mock('@/lib/wallet/testnetWallet');
   ```

2. **Mock viem if used**:
   ```typescript
   vi.mock('viem', async () => {
     const actual = await vi.importActual('viem');
     return {
       ...actual,
       createPublicClient: vi.fn(() => ({
         readContract: vi.fn(),
       })),
     };
   });
   ```

3. **Mock fetch for HTTP calls**:
   ```typescript
   global.fetch = vi.fn();
   ```

4. **Never use real wallet addresses or private keys in tests**

## E2E Tests

E2E tests in `e2e/` may make HTTP requests to your local server, but they:
- Do NOT interact with real blockchain networks
- Do NOT send real transactions
- Only test UI and API endpoints (which should be mocked in test environment)
