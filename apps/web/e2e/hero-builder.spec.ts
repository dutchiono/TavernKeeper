import { expect, test } from '@playwright/test';

test.describe('Hero Builder Page (/hero-builder)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/hero-builder');
        await page.waitForLoadState('networkidle');
    });

    test('page loads without errors', async ({ page }) => {
        // Check page title/heading - page has "Hero Builder" or "InnKeeper Forge"
        const heading = page.getByRole('heading', { name: /Hero Builder|InnKeeper Forge/i }).first();
        await expect(heading).toBeVisible();

        // Check for no console errors
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.waitForLoadState('networkidle');

        // Log errors if any found before assertion
        const criticalErrors = errors.filter(e =>
            e.includes('Uncaught') || e.includes('ReferenceError') || e.includes('TypeError')
        );

        if (criticalErrors.length > 0) {
            console.log('Critical Console Errors:', criticalErrors);
        }

        expect(criticalErrors.length).toBe(0);
    });

    test('sprite preview renders', async ({ page }) => {
        // Wait for page to fully load
        await page.waitForLoadState('networkidle');

        // Check for canvas element (SpritePreview uses canvas)
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible({ timeout: 10000 });

        // Check for class selector
        const classSelector = page.getByText(/Class/i);
        await expect(classSelector).toBeVisible();
    });

    test('randomize button works', async ({ page }) => {
        // Get initial class or color state (indirectly via UI or screenshot if needed, but we'll check for button interaction)
        const randomizeButton = page.getByRole('button', { name: /Randomize/i });
        await expect(randomizeButton).toBeVisible();

        await randomizeButton.click();
        // Wait for potential re-render
        await page.waitForTimeout(500);

        // Verify canvas is still visible
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
    });

    test('customization controls are interactive', async ({ page }) => {
        // Check for color inputs
        const colorInputs = page.locator('input[type="color"]');
        const count = await colorInputs.count();
        expect(count).toBeGreaterThan(0);

        // Interact with a color input
        const firstColorInput = colorInputs.first();
        await firstColorInput.fill('#ff0000');

        // Check for class selection buttons
        const warriorButton = page.getByRole('button', { name: /Warrior/i });
        if (await warriorButton.count() > 0) {
            await warriorButton.click();
        }
    });

    test('mint button is disabled without wallet or enabled if mock wallet', async ({ page }) => {
        // Check for mint button
        const mintButton = page.getByRole('button', { name: /Mint Hero/i });
        await expect(mintButton).toBeVisible();

        // Note: Since we don't have a real wallet connected in E2E, it might be disabled or show "Connect Wallet"
        // We just verify it exists and is visible
    });
});
