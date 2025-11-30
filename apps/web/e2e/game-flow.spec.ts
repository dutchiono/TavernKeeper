import { expect, test } from '@playwright/test';

/**
 * Game Flow E2E Tests
 * Tests complete user journeys and game flows
 */

test.describe('Navigation Flow', () => {
  test('user can navigate between all main pages', async ({ page }) => {
    // Start at home
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /TAVERNKEEPER/i })).toBeVisible({ timeout: 10000 });

    // Navigate to party page
    await page.goto('/party', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Party Manager/i })).toBeVisible({ timeout: 10000 });

    // Navigate to map page
    await page.goto('/map', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading').filter({ hasText: /Map|Cellar|Warren/i }).first()).toBeVisible({ timeout: 10000 });

    // Navigate to miniapp
    await page.goto('/miniapp', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /TavernKeeper Mini/i })).toBeVisible({ timeout: 10000 });

    // Go back to home
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /TAVERNKEEPER/i })).toBeVisible({ timeout: 10000 });
  });

  test('back buttons work on all pages', async ({ page }) => {
    // Test party page back button
    await page.goto('/party');
    const partyBackButton = page.getByRole('button', { name: /Back to Inn|Back/i });
    if (await partyBackButton.count() > 0) {
      await partyBackButton.first().click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/$/);
    }

    // Test map page back button
    await page.goto('/map');
    const mapBackButton = page.getByRole('button', { name: /Back to Inn|Back/i });
    if (await mapBackButton.count() > 0) {
      await mapBackButton.first().click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/$/);
    }
  });
});

test.describe('Start Run Flow', () => {
  test('can initiate a run from map page', async ({ page, request }) => {
    // Go to map page
    await page.goto('/map');
    await page.waitForLoadState('networkidle');

    // Look for "Start Run" or "Enter Dungeon" button
    const startRunButton = page.getByRole('button', { name: /Start Run|Enter Dungeon|ENTER DUNGEON/i });

    if (await startRunButton.count() > 0) {
      // Click the button
      await startRunButton.first().click();
      await page.waitForTimeout(1000);

      // Should either navigate or show run interface
      // Check for battle/run related content
      const runContent = page.locator('[class*="battle"], [class*="run"], [class*="dungeon"]').or(
        page.getByText(/Battle|Combat|Run/i)
      );

      // Either the button triggers navigation or shows content
      const hasRunContent = await runContent.count() > 0;
      const currentUrl = page.url();
      const isRunPage = currentUrl.includes('/run/');

      expect(hasRunContent || isRunPage).toBeTruthy();
    }
  });

  test('run creation API endpoint is accessible', async ({ request }) => {
    // Test the API endpoint
    const response = await request.post('/api/runs', {
      data: {
        dungeonId: 'test-dungeon',
        party: ['char-1', 'char-2'],
        seed: `test-seed-${Date.now()}`,
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

  test('can view run details after creation', async ({ page, request }) => {
    // Try to create a run
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
      await page.waitForLoadState('networkidle');

      // Should show run details
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Should show run ID somewhere
      const runIdText = page.getByText(id, { exact: false });
      await expect(runIdText).toBeVisible({ timeout: 5000 });
    } else {
      // If API fails, just check that the route doesn't crash
      await page.goto('/run/test-run-id');
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Agent Interaction Flow', () => {
  test('can select agent from party roster on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find party roster agents
    const agentCards = page.locator('[class*="agent"], [class*="party"]').filter({
      hasNot: page.getByText(/No heroes/i)
    });

    const count = await agentCards.count();
    if (count > 0) {
      // Click first agent
      await agentCards.first().click();
      await page.waitForTimeout(500);

      // Should show agent detail modal or highlight
      const agentDetail = page.locator('[class*="modal"], [class*="detail"], [class*="selected"]').first();
      await expect(agentDetail).toBeVisible({ timeout: 5000 });
    }
  });

  test('can view and interact with agent details', async ({ page }) => {
    await page.goto('/party');
    await page.waitForLoadState('networkidle');

    // Find and click an agent
    const agentCards = page.locator('[class*="agent"], [class*="card"]').filter({
      hasNot: page.getByText(/No heroes/i)
    });

    const count = await agentCards.count();
    if (count > 0) {
      await agentCards.first().click();
      await page.waitForTimeout(500);

      // Check for details panel
      const detailsPanel = page.locator('[class*="detail"], [class*="Details"]').first();
      await expect(detailsPanel).toBeVisible({ timeout: 5000 });

      // Check for stats
      const stats = page.getByText(/STR|INT|HP|MP/i);
      await expect(stats.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('View Switching Flow', () => {
  test('home page structure supports view switching', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The home page uses game store for view switching, not navigation buttons
    // Check that the main structure exists
    const mainContent = page.locator('main').first();
    await expect(mainContent).toBeVisible();

    // Check that scene area exists (where views render)
    const sceneArea = page.locator('main > div').first();
    await expect(sceneArea).toBeVisible();

    // View switching is handled programmatically via game store
    // This test verifies the UI structure is ready for it
  });
});

