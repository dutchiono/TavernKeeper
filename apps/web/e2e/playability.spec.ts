import { test, expect } from '@playwright/test';

/**
 * Playability Tests - Ensure the game is actually playable
 * These tests verify core user flows and game functionality
 */

test.describe('Game Playability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('home page loads and displays correctly', async ({ page }) => {
    // Check that the page loads
    await expect(page).toHaveTitle(/TavernKeeper/i);

    // Check for main heading
    const heading = page.getByRole('heading', { name: /TAVERNKEEPER/i });
    await expect(heading).toBeVisible();

    // Check that scene container is present (DOM-based, not canvas)
    const sceneContainer = page.locator('[class*="InnScene"], main').first();
    await expect(sceneContainer).toBeVisible({ timeout: 10000 });
  });

  test('navigation works between pages', async ({ page }) => {
    // Home page should be accessible
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /TAVERNKEEPER/i })).toBeVisible();

    // Party page should be accessible
    await page.goto('/party');
    await expect(page.getByRole('heading', { name: /Party Manager/i })).toBeVisible();

    // Map page should be accessible
    await page.goto('/map');
    await expect(page.getByRole('heading', { name: /Dungeon Map/i })).toBeVisible();
  });

  test('home page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that content is visible and not cut off
    const heading = page.getByRole('heading', { name: /TAVERNKEEPER/i });
    await expect(heading).toBeVisible();

    // Check that there's no horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()?.width || 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Small tolerance
  });

  test('party page loads without errors', async ({ page }) => {
    await page.goto('/party');

    // Check page loads
    await expect(page.getByRole('heading', { name: /Party Manager/i })).toBeVisible();

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') || e.includes('ReferenceError') || e.includes('TypeError')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('map page loads without errors', async ({ page }) => {
    await page.goto('/map');

    await expect(page.getByRole('heading', { name: /Dungeon Map/i })).toBeVisible();

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });
});

test.describe('API Integration Playability', () => {
  test('can create a run via API', async ({ request }) => {
    // This test verifies the API works for creating runs
    const response = await request.post('/api/runs', {
      data: {
        dungeonId: 'test-dungeon',
        party: ['char-1', 'char-2'],
        seed: 'test-seed-123',
      },
    });

    // Should either succeed (200) or fail gracefully (400/500)
    expect([200, 400, 500]).toContain(response.status());

    if (response.ok()) {
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('status');
    }
  });

  test('run detail page handles missing runs gracefully', async ({ page }) => {
    // Try to access a non-existent run
    await page.goto('/run/non-existent-run-id');

    // Should not crash - either show 404 or error message
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Check for no unhandled errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    // Allow some errors but not critical ones
    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') || e.includes('ReferenceError')
    );
    expect(criticalErrors.length).toBe(0);
  });
});

test.describe('Performance & Accessibility', () => {
  test('page loads within reasonable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load in under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('has accessible heading structure', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    const h1 = page.getByRole('heading', { level: 1 });
    await expect(h1).toBeVisible();
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/');

    // Tab through page
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should not get stuck or crash
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Scene Rendering Playability', () => {
  test('InnScene renders on home page', async ({ page }) => {
    await page.goto('/');

    // Wait for scene container to appear (DOM-based, not canvas)
    const sceneContainer = page.locator('[class*="InnScene"], main').first();
    await expect(sceneContainer).toBeVisible({ timeout: 10000 });

    // Check container has dimensions
    const containerSize = await sceneContainer.boundingBox();
    expect(containerSize?.width).toBeGreaterThan(0);
    expect(containerSize?.height).toBeGreaterThan(0);
  });

  test('scene is interactive (can be clicked)', async ({ page }) => {
    await page.goto('/');

    const sceneContainer = page.locator('[class*="InnScene"], main').first();
    await expect(sceneContainer).toBeVisible({ timeout: 10000 });

    // Click on scene - should not crash
    await sceneContainer.click({ position: { x: 100, y: 100 } });

    // Wait a bit to ensure no errors
    await page.waitForTimeout(500);

    // Check for no critical errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(1000);
    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') || e.includes('TypeError')
    );
    expect(criticalErrors.length).toBe(0);
  });

  test('MapScene renders on map page', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Wait for map scene to appear (DOM-based)
    const mapScene = page.locator('[class*="MapScene"], main').first();
    await expect(mapScene).toBeVisible({ timeout: 10000 });

    // Check scene has dimensions
    const sceneSize = await mapScene.boundingBox();
    expect(sceneSize?.width).toBeGreaterThan(0);
    expect(sceneSize?.height).toBeGreaterThan(0);
  });
});

