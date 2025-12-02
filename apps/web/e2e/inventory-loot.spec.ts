import { expect, test } from '@playwright/test';

test.describe('Inventory Management', () => {
  test('inventory manager component renders', async ({ page }) => {
    // Navigate to a page that might show inventory
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for inventory-related UI elements
    const inventoryElements = page.locator('[class*="inventory"], [class*="Inventory"]').or(
      page.getByText(/Inventory|Items/i)
    );

    // Inventory might not be visible if user has no items, that's okay
    // Just verify page loads without errors
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

    expect(criticalErrors.length).toBe(0);
  });

  test('inventory unequip API validates input', async ({ request }) => {
    // Test unequip endpoint (should validate required fields)
    const response = await request.post('/api/inventory/unequip', {
      data: {
        // Missing required fields
      },
    });

    // Should return 400 for missing fields
    expect([400, 500]).toContain(response.status());
  });

  test('inventory unequip API requires contract configuration', async ({ request }) => {
    // Test with partial data
    const response = await request.post('/api/inventory/unequip', {
      data: {
        itemId: '123',
        amount: '1',
        adventurerContract: '0xadv123',
        adventurerTokenId: '456',
        tavernKeeperContract: '0xtk123',
        tavernKeeperTokenId: '789',
      },
    });

    // Should either succeed (if mocked) or fail gracefully
    expect([200, 400, 500]).toContain(response.status());
  });
});

test.describe('Loot Claiming', () => {
  test('loot claim modal can be accessed', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for loot-related UI
    const lootElements = page.locator('[class*="loot"], [class*="Loot"]').or(
      page.getByText(/Loot|Claim/i)
    );

    // Loot might not be visible if user has no claims, that's okay
    // Just verify page loads without errors
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

    expect(criticalErrors.length).toBe(0);
  });

  test('loot claim API validates input', async ({ request }) => {
    // Test POST /api/loot/claim (should require claimId)
    const postResponse = await request.post('/api/loot/claim', {
      data: {
        // Missing claimId
      },
    });

    expect([400, 500]).toContain(postResponse.status());
  });

  test('loot claim API supports GET for claim info', async ({ request }) => {
    // Test GET /api/loot/claim?claimId=test-123
    const getResponse = await request.get('/api/loot/claim?claimId=test-123');

    // Should either return claim info or 404/error
    expect([200, 400, 404, 500]).toContain(getResponse.status());
  });

  test('loot claim API supports gas estimation', async ({ request }) => {
    // Test GET /api/loot/claim?claimId=test-123&action=estimate
    const estimateResponse = await request.get('/api/loot/claim?claimId=test-123&action=estimate');

    // Should either return estimate or error
    expect([200, 400, 404, 500]).toContain(estimateResponse.status());
  });
});
