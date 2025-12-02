import { existsSync, readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Clean test results and reports before each test run
 * This ensures we don't accumulate old test results
 *
 * IMPORTANT: Only removes Playwright-specific files, preserves Vitest results
 */
async function globalSetup() {
  const testResultsDir = join(__dirname, '..', 'test-results');
  const reportDir = join(__dirname, '..', 'playwright-report');

  // Clean test-results subdirectories and Playwright files (but preserve Vitest results)
  if (existsSync(testResultsDir)) {
    const entries = readdirSync(testResultsDir);
    for (const entry of entries) {
      const fullPath = join(testResultsDir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Remove all subdirectories (Playwright test artifacts)
        rmSync(fullPath, { recursive: true, force: true });
      } else {
        // Only remove Playwright-specific files, preserve Vitest results
        if (entry === 'playwright-results.json' || entry.startsWith('playwright-')) {
          rmSync(fullPath, { force: true });
        }
        // Keep vitest-results.json and other non-playwright files
      }
    }
  }

  // Clean playwright-report directory completely
  if (existsSync(reportDir)) {
    rmSync(reportDir, { recursive: true, force: true });
  }
}

export default globalSetup;

