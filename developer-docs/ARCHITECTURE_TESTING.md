# Architecture Testing Documentation

## Overview

This document describes the test governance system, test structure, coverage requirements, and how to maintain test quality in the TavernKeeper codebase.

## Test Governance System

### Test Policy

The test policy is defined in `test-policy.ts` at the repository root. This file serves as the single source of truth for:

- Which files must have tests
- Which files are allowed to be untested
- Coverage thresholds per architectural zone
- Test file naming conventions

### Meta-Tests

The `repo-health.test.ts` file contains meta-tests that validate repository structure:

- **Untested Files Check**: Verifies all required source files have tests
- **Orphan Detection**: Finds files not imported anywhere
- **Test File Structure**: Validates test file naming conventions
- **Coverage Thresholds**: Ensures coverage requirements are defined

These tests run as part of the normal test suite and fail if the repository structure is unhealthy.

## Test Structure

### Test Organization

Tests are organized to mirror the source code structure:

```
apps/web/
├── __tests__/
│   ├── api/              # API route tests
│   ├── lib/              # Library code tests
│   ├── services/         # Service layer tests
│   ├── workers/          # Worker tests
│   └── repo-health.test.ts  # Meta-tests
```

### Test File Naming

Test files must follow one of these patterns:
- `*.test.ts`
- `*.test.tsx`
- `*.spec.ts`
- `*.spec.tsx`
- Files in `__tests__/` directories

## Coverage Requirements

### Global Thresholds

Minimum coverage requirements (defined in `test-policy.ts`):
- Statements: 70%
- Branches: 60%
- Functions: 65%
- Lines: 70%

### Zone-Specific Requirements

Different architectural zones have different coverage requirements:

- **API Routes**: 80% (higher due to external interface)
- **Workers**: 75% (background processing needs reliability)
- **Services**: 75% (business logic needs thorough testing)
- **Library Code**: 70% (standard coverage)

### Running Coverage

```bash
# Generate coverage report
pnpm --filter @innkeeper/web test:coverage

# Coverage reports are generated in:
# - apps/web/coverage/ (HTML report)
# - apps/web/coverage/coverage-final.json (JSON report)
```

## Redis Testing

### Redis Checkpointing

Tests for Redis checkpoint operations in `dungeonRunService.ts`:
- Connection creation and error handling
- Checkpoint save operations (setex with TTL)
- Checkpoint retrieval (get)
- Checkpoint cleanup (del)
- Graceful degradation when Redis unavailable

**Test File**: `apps/web/__tests__/services/redisCheckpointing.test.ts`

### Redis Queue

Tests for BullMQ queue operations:
- Queue connection and retry strategy
- Error handling and reconnection
- Connection events (connect, ready, error)
- Ping operations

**Test File**: `apps/web/__tests__/lib/redisQueue.test.ts`

## Queue Architecture

### BullMQ Integration

The application uses BullMQ for job queue management:

- **runQueue**: Processes dungeon run simulations
- **replayQueue**: Generates run replays

Both queues share the same Redis connection for efficiency.

### Redis Connection

Redis connection is configured in `apps/web/lib/queue.ts`:
- Uses `REDIS_URL` environment variable
- Falls back to `redis://localhost:6379` for local development
- Implements exponential backoff retry strategy
- Handles reconnection automatically

## Adding New Tests

### For New API Routes

1. Create test file: `apps/web/__tests__/api/[route-name].test.ts`
2. Test all HTTP methods (GET, POST, etc.)
3. Test error cases
4. Test edge cases
5. Ensure coverage meets API zone requirement (80%)

### For New Services

1. Create test file: `apps/web/__tests__/services/[service-name].test.ts`
2. Test all public methods
3. Test error handling
4. Test edge cases
5. Ensure coverage meets service zone requirement (75%)

### For New Workers

1. Create test file: `apps/web/__tests__/workers/[worker-name].test.ts`
2. Test job processing
3. Test error handling
4. Test cleanup operations
5. Ensure coverage meets worker zone requirement (75%)

## Running Tests

### Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm --filter @innkeeper/web test -- runs-active.test.ts

# Run tests matching pattern
pnpm --filter @innkeeper/web test -- --grep "Redis"
```

### E2E Tests

```bash
# Run e2e tests
pnpm test:e2e

# Run e2e tests in UI mode
pnpm test:e2e:ui

# Run e2e tests in headed mode
pnpm test:e2e:headed
```

### Meta-Tests

Meta-tests run automatically with unit tests:

```bash
pnpm test
# Includes repo-health.test.ts
```

## Architecture Analysis

### Running Analysis

```bash
# Generate dependency graph and find orphans
tsx scripts/analyze-architecture.ts
```

This generates:
- `docs/architecture-dependency-graph.md` - Mermaid diagram
- `docs/architecture-analysis.json` - Detailed analysis report

### Analysis Output

The analysis script provides:
- Circular dependency detection
- Orphaned file detection
- Import graph visualization
- Statistics on codebase structure

## Best Practices

### Test Organization

1. **Mirror source structure**: Keep test files close to source files
2. **Use descriptive names**: Test file names should clearly indicate what they test
3. **Group related tests**: Use `describe` blocks to organize tests
4. **Test one thing**: Each test should verify one specific behavior

### Test Quality

1. **Test behavior, not implementation**: Focus on what the code does, not how
2. **Test edge cases**: Don't just test the happy path
3. **Test error handling**: Verify errors are handled gracefully
4. **Use mocks appropriately**: Mock external dependencies, not internal logic

### Coverage

1. **Aim for quality over quantity**: 70% well-tested code is better than 90% poorly tested
2. **Focus on critical paths**: API routes and services need higher coverage
3. **Don't test implementation details**: Test public interfaces
4. **Review coverage reports**: Identify gaps and prioritize important areas

## Troubleshooting

### Tests Failing Due to Coverage

If tests fail due to coverage thresholds:

1. Check coverage report: `pnpm --filter @innkeeper/web test:coverage`
2. Identify files below threshold
3. Add tests for uncovered code paths
4. If code is truly untestable, add to `allowedUntestedGlobs` in `test-policy.ts`

### Meta-Tests Failing

If `repo-health.test.ts` fails:

1. Check which check failed (untested files, orphans, etc.)
2. Review the error output for specific files
3. Add tests for untested files OR add to `allowedUntestedGlobs`
4. Remove or use orphaned files OR add to `allowedUntestedGlobs`

### Redis Tests Failing

If Redis tests fail:

1. Ensure Redis is running (or mocked properly)
2. Check `REDIS_URL` environment variable
3. Verify Redis connection in test setup
4. Check test mocks are properly configured

## Continuous Improvement

### Regular Reviews

- Review coverage reports monthly
- Run architecture analysis quarterly
- Update test policy as codebase evolves
- Remove obsolete tests

### Metrics to Track

- Overall coverage percentage
- Coverage per zone
- Number of untested files
- Number of orphaned files
- Test execution time

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Test Policy](./test-policy.ts) - Source of truth for test requirements

