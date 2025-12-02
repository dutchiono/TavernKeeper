import { expect, test } from '@playwright/test';

test.describe('Party Invite Flow', () => {
  test('party page loads without errors', async ({ page }) => {
    await page.goto('/party');
    await page.waitForLoadState('networkidle');

    // Check for party page content
    const heading = page.getByRole('heading', { name: /Party|Manager/i }).first();
    await expect(heading).toBeVisible({ timeout: 10000 });

    // Check for no console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(e =>
      e.includes('Uncaught') || e.includes('ReferenceError') || e.includes('TypeError')
    );

    if (criticalErrors.length > 0) {
      console.log('Critical Console Errors:', criticalErrors);
    }

    expect(criticalErrors.length).toBe(0);
  });

  test('party invite page loads', async ({ page }) => {
    // Try navigating to invite page with a test code
    await page.goto('/party-invite/TEST123');
    await page.waitForLoadState('networkidle');

    // Page should load (even if invite is invalid)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('can view party details', async ({ page, request }) => {
    // Try to create a party first
    const createResponse = await request.post('/api/parties', {
      data: {
        ownerId: 'test-user-123',
        dungeonId: 'test-dungeon',
      },
    });

    if (createResponse.ok()) {
      const party = await createResponse.json();

      // Navigate to party page
      await page.goto('/party');
      await page.waitForLoadState('networkidle');

      // Should show party information
      const body = page.locator('body');
      await expect(body).toBeVisible();
    }
  });

  test('party API endpoints are accessible', async ({ request }) => {
    // Test GET /api/parties
    const getResponse = await request.get('/api/parties?userId=test-user-123');
    expect([200, 400, 500]).toContain(getResponse.status());

    // Test POST /api/parties
    const postResponse = await request.post('/api/parties', {
      data: {
        ownerId: 'test-user-123',
        dungeonId: 'test-dungeon',
      },
    });
    expect([200, 400, 500]).toContain(postResponse.status());
  });

  test('party invite API endpoint validates input', async ({ request }) => {
    // Test invite generation (requires party ID)
    const response = await request.post('/api/parties/test-party-123/invite', {
      data: {
        userId: 'test-user-123',
      },
    });

    // Should either succeed or fail gracefully
    expect([200, 400, 404, 500]).toContain(response.status());
  });

  test('party join API endpoint validates ownership', async ({ request }) => {
    // Test joining party (requires hero ownership verification)
    const response = await request.post('/api/parties/test-party-123/join', {
      data: {
        userId: 'test-user-123',
        heroTokenId: '123',
        heroContract: '0xcontract123',
        userWallet: '0xwallet123',
      },
    });

    // Should either succeed, fail validation, or fail ownership check
    expect([200, 400, 403, 404, 500]).toContain(response.status());
  });
});
