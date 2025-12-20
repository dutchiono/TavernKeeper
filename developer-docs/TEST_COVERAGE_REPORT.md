# Test Coverage Report

**Last Updated**: Auto-generated on test run
**Coverage Threshold**: See `test-policy.ts` for current thresholds

## Overview

This document tracks test coverage across the codebase. Coverage reports are generated automatically when running tests with coverage enabled.

## Running Coverage Analysis

```bash
# Generate coverage report
pnpm --filter @innkeeper/web test:coverage

# View HTML report
# Open: apps/web/coverage/index.html
```

## Coverage Thresholds

### Global Thresholds

| Metric | Threshold | Current | Status |
|--------|-----------|---------|--------|
| Statements | 70% | TBD | ⏳ |
| Branches | 60% | TBD | ⏳ |
| Functions | 65% | TBD | ⏳ |
| Lines | 70% | TBD | ⏳ |

### Zone-Specific Thresholds

| Zone | Threshold | Current | Status |
|------|-----------|---------|--------|
| API Routes | 80% | TBD | ⏳ |
| Workers | 75% | TBD | ⏳ |
| Services | 75% | TBD | ⏳ |
| Library Code | 70% | TBD | ⏳ |

## Coverage by Directory

### API Routes (`apps/web/app/api`)

| Route | Coverage | Status |
|-------|----------|--------|
| `/api/runs` | TBD | ⏳ |
| `/api/runs/[id]` | TBD | ⏳ |
| `/api/runs/active` | TBD | ⏳ |
| ... | ... | ... |

### Services (`apps/web/lib/services`)

| Service | Coverage | Status |
|---------|----------|--------|
| `runService.ts` | TBD | ⏳ |
| `dungeonRunService.ts` | TBD | ⏳ |
| `redisCheckpointing` | TBD | ⏳ |
| ... | ... | ... |

### Workers (`apps/web/workers`)

| Worker | Coverage | Status |
|--------|----------|--------|
| `runWorker.ts` | TBD | ⏳ |
| ... | ... | ... |

### Library Code (`apps/web/lib`)

| Module | Coverage | Status |
|--------|----------|--------|
| `queue.ts` | TBD | ⏳ |
| `supabase.ts` | TBD | ⏳ |
| ... | ... | ... |

## Untested Files

Files that require tests (from `repo-health.test.ts`):

```
# Run meta-tests to see current list:
pnpm test -- --grep "Repository Health"
```

## Recent Improvements

### Redis Testing

- ✅ Added comprehensive Redis checkpointing tests
- ✅ Added comprehensive Redis queue tests
- ✅ Tests cover connection, retry, error handling

### Test Governance

- ✅ Added test policy configuration
- ✅ Added repository health meta-tests
- ✅ Added coverage thresholds enforcement

## Coverage Gaps

### High Priority

1. **API Routes**: Some routes may need additional test coverage
2. **Services**: Complex services may have uncovered edge cases
3. **Workers**: Background processing needs thorough testing

### Medium Priority

1. **Library Code**: Utility functions need coverage
2. **Error Handling**: Error paths need more testing
3. **Edge Cases**: Boundary conditions need coverage

## Action Items

- [ ] Run coverage analysis and update this report
- [ ] Identify files below threshold
- [ ] Prioritize coverage improvements
- [ ] Add tests for critical paths
- [ ] Review and update test policy as needed

## Notes

- Coverage percentages are updated when running `test:coverage`
- HTML report provides detailed line-by-line coverage
- JSON report (`coverage/coverage-final.json`) can be used for automation
- Meta-tests (`repo-health.test.ts`) validate test coverage requirements

## Resources

- [Coverage HTML Report](./coverage/index.html) - Detailed line-by-line coverage
- [Coverage JSON Report](./coverage/coverage-final.json) - Machine-readable coverage
- [Test Policy](../test-policy.ts) - Coverage thresholds and requirements
- [Architecture Testing Guide](./ARCHITECTURE_TESTING.md) - How to add tests

