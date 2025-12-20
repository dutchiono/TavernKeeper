# Testing Guide

## Quick Start

### Watch Mode (Recommended for Development)

**Run tests in watch mode - automatically reruns on file changes:**

```bash
# Unit tests only
pnpm test:watch

# E2E tests only
pnpm test:e2e:watch

# Both unit and E2E tests
pnpm test:watch:all
```

Keep one of these running in a terminal while you develop. Tests will automatically rerun when you save files.

## Test Commands

### Unit Tests (Vitest)

```bash
# Run once
pnpm test

# Watch mode (auto-rerun on changes)
pnpm test:watch

# With coverage report
pnpm test:coverage
```

### E2E Tests (Playwright)

```bash
# Run once (headless)
pnpm test:e2e

# Watch mode (auto-rerun on changes)
pnpm test:e2e:watch

# Run with browser visible (see what's happening)
pnpm test:e2e:headed

# Interactive UI mode (best for debugging)
pnpm test:e2e:ui
```

### Run All Tests

```bash
# Run both unit and E2E tests
pnpm test:all

# Watch both simultaneously
pnpm test:watch:all
```

## What Gets Tested

### Unit Tests (`__tests__/`)
- API route handlers
- Utility functions
- Component logic
- Data transformations

### E2E Tests (`e2e/`)
- **Game playability** - Can users actually play?
- Page loading and navigation
- Mobile responsiveness
- PixiJS canvas rendering
- API integration
- Error handling
- Performance

## Terminal Output

All test commands output results directly to your terminal:

- ✅ Green checkmarks = passing tests
- ❌ Red X = failing tests
- ⏱️ Shows test execution time
- 📊 Shows test counts and coverage

## Watch Mode Tips

1. **Keep watch mode running** - It's your safety net
2. **Watch the terminal** - See failures immediately
3. **Fix red tests** - Don't commit with failing tests
4. **Green = good** - All green means you're safe to commit

## Debugging Failed Tests

### Unit Tests
- Check terminal output for error messages
- Run specific test file: `pnpm test path/to/test.ts`
- Add `console.log()` in your code

### E2E Tests
- Use `pnpm test:e2e:headed` to see browser
- Use `pnpm test:e2e:ui` for interactive debugging
- Check `playwright-report/index.html` for screenshots
- Check terminal for error details

## Continuous Testing Workflow

**Recommended setup:**
1. Terminal 1: `pnpm dev` (dev server)
2. Terminal 2: `pnpm test:watch` (unit tests)
3. Terminal 3: `pnpm test:e2e:watch` (E2E tests)

Or use: `pnpm test:watch:all` in one terminal.

## Test Coverage

Run coverage report:
```bash
pnpm test:coverage
```

This shows which code is tested and which isn't. Aim for:
- 80%+ coverage on critical paths
- 100% coverage on API routes
- 100% coverage on game logic

## Writing Tests

### Unit Test Example
```typescript
// __tests__/my-component.test.ts
import { describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### E2E Test Example
```typescript
// e2e/my-feature.spec.ts
import { test, expect } from '@playwright/test';

test('user can click button', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: /click me/i });
  await button.click();
  // Verify result
});
```

## Troubleshooting

**Tests not running?**
- Make sure dev server is running (`pnpm dev`)
- Check that ports 3000 (dev) and 3001 (test) are free

**E2E tests failing?**
- Run with `--headed` to see what's happening
- Check browser console for errors
- Verify API endpoints are working

**Watch mode not detecting changes?**
- Make sure you're saving files
- Check file is in correct directory
- Restart watch mode

## CI/CD

Tests run automatically in CI:
- All unit tests must pass
- All E2E tests must pass
- Coverage must meet threshold

Don't commit code with failing tests!

