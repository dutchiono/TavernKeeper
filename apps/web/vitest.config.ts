import { existsSync, rmSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Clean vitest results before each run
const testResultsFile = path.join(__dirname, 'test-results', 'vitest-results.json');
if (existsSync(testResultsFile)) {
  rmSync(testResultsFile, { force: true });
}

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      // Exclude contract integration tests that make real calls (require testnet setup)
      '**/__tests__/services/tavernKeeperService.test.ts', // Makes real contract calls
    ],
    // Separate test suites - contract tests are isolated
    include: ['**/__tests__/**/*.test.ts'],
    reporters: [
      'default',
      ['json', { outputFile: 'test-results/vitest-results.json' }], // Overwrites previous file
    ],
    // Use forks instead of threads to avoid "Terminating worker thread" errors
    // These errors are harmless but occur during worker cleanup with threads
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: false,
        isolate: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  // Suppress esbuild CJS deprecation warning
  esbuild: {
    target: 'node18',
  },
});
