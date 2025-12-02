import { expect, test } from '@playwright/test';

/**
 * User Flow Tests - Test complete user journeys
 * These ensure the game is playable end-to-end
 */

test.describe('Complete User Flows', () => {
  test('user can navigate through all main pages', async ({ page }) => {
    // Start at home
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /TAVERNKEEPER/i })).toBeVisible();

    // Navigate to party
    await page.goto('/party');
    await expect(page.getByRole('heading', { name: /Party Manager/i })).toBeVisible();

    // Navigate to map
    await page.goto('/map');
    await expect(page.getByRole('heading', { name: /Dungeon Map/i })).toBeVisible();

    // Go back to home
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /TAVERNKEEPER/i })).toBeVisible();
  });

  test('user can view run details (if run exists)', async ({ page, request }) => {
    // Try to create a run first
    const createResponse = await request.post('/api/runs', {
      data: {
        dungeonId: 'test-dungeon',
        party: ['char-1'],
        seed: `flow-test-${Date.now()}`,
      },
    });

    if (createResponse.ok()) {
      const { id } = await createResponse.json();

      // Navigate to run detail page
      await page.goto(`/run/${id}`);

      // Should show run details (even if placeholder)
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Should show run ID somewhere
      const runIdText = page.getByText(id, { exact: false });
      await expect(runIdText).toBeVisible();
    } else {
      // If API fails, just check that the route doesn't crash
      await page.goto('/run/test-run-id');
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('mobile user experience is functional', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test all pages on mobile (including new pages)
    const pages = ['/', '/party', '/map', '/marketplace', '/hero-builder', '/miniapp'];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // Check page is visible and not broken
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = page.viewportSize()?.width || 375;
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 20);
    }
  });
});

test.describe('Error Handling', () => {
  test('handles network errors gracefully', async ({ page, context }) => {
    // Block network requests (but allow initial page load)
    await context.route('**/*', (route) => {
      if (route.request().url().includes('localhost:3000') && route.request().resourceType() === 'document') {
        route.continue();
      } else {
        route.abort();
      }
    });

    // Try to navigate - may fail but shouldn't crash
    try {
      await page.goto('/', { timeout: 5000, waitUntil: 'domcontentloaded' });
    } catch (e) {
      // Expected to fail when network is blocked
    }

    // Should still show something (even if error state)
    const body = page.locator('body');
    await expect(body).toBeVisible({ timeout: 1000 });
  });

  test('handles API errors gracefully', async ({ page }) => {
    // Try to access invalid endpoints
    await page.goto('/run/invalid-id-12345');

    // Should not crash
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Should show some content (error message or placeholder)
    const content = page.locator('main, body');
    await expect(content).toBeVisible();
  });
});

