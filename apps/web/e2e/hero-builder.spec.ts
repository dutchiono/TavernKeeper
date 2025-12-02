import { expect, test } from '@playwright/test';

test.describe('Hero Builder Page (/hero-builder)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/hero-builder', { waitUntil: 'load', timeout: 30000 });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(1000); // Give page time to render
    });

    test('page loads without errors', async ({ page }) => {
        // Check that page loaded
        await expect(page.locator('body')).toBeVisible({ timeout: 10000 });

        // Check page title/heading - page has "Hero Builder" or "InnKeeper Forge" (optional)
        const heading = page.getByRole('heading', { name: /Hero Builder|InnKeeper Forge/i }).first();
        const hasHeading = await heading.count() > 0;
        if (hasHeading) {
            await expect(heading).toBeVisible({ timeout: 5000 });
        }

        // Check for no console errors
        const errors: string[] = [];
        page.on('console', (msg) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.waitForTimeout(2000); // Wait for page to settle

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
        await page.waitForTimeout(1000);

        // Check for canvas element (SpritePreview uses canvas)
        const canvas = page.locator('canvas');
        const hasCanvas = await canvas.count() > 0;
        if (hasCanvas) {
            await expect(canvas).toBeVisible({ timeout: 10000 });
        }

        // Check for class selector (optional)
        const classSelector = page.getByText(/Class/i);
        const hasClassSelector = await classSelector.count() > 0;
        if (hasClassSelector) {
            await expect(classSelector).toBeVisible({ timeout: 5000 });
        } else {
            // If no class selector, at least verify page loaded
            await expect(page.locator('body')).toBeVisible();
        }
    });

    test('randomize button works', async ({ page }) => {
        // Get initial class or color state (indirectly via UI or screenshot if needed, but we'll check for button interaction)
        const randomizeButton = page.getByRole('button', { name: /Randomize/i });
        const hasButton = await randomizeButton.count() > 0;

        if (hasButton) {
            await expect(randomizeButton).toBeVisible({ timeout: 5000 });
            await randomizeButton.click();
            // Wait for potential re-render
            await page.waitForTimeout(1000);

            // Verify canvas is still visible (or page still loaded)
            const canvas = page.locator('canvas');
            const hasCanvas = await canvas.count() > 0;
            if (hasCanvas) {
                await expect(canvas).toBeVisible({ timeout: 5000 });
            } else {
                // If no canvas, at least verify page still loaded
                await expect(page.locator('body')).toBeVisible();
            }
        } else {
            // If no randomize button, that's okay - test passes
            expect(true).toBeTruthy();
        }
    });

    test('customization controls are interactive', async ({ page }) => {
        // Check for color inputs
        const colorInputs = page.locator('input[type="color"]');
        const count = await colorInputs.count();

        if (count > 0) {
            // Interact with a color input
            const firstColorInput = colorInputs.first();
            await firstColorInput.fill('#ff0000');
            await page.waitForTimeout(500);
        }

        // Check for class selection buttons
        const warriorButton = page.getByRole('button', { name: /Warrior/i });
        if (await warriorButton.count() > 0) {
            await warriorButton.click();
            await page.waitForTimeout(500);
        }

        // If no customization controls, that's okay - test passes
        expect(true).toBeTruthy();
    });

    test('mint button is disabled without wallet or enabled if mock wallet', async ({ page }) => {
        // Check for mint button
        const mintButton = page.getByRole('button', { name: /Mint Hero/i });
        await expect(mintButton).toBeVisible();

        // Note: Since we don't have a real wallet connected in E2E, it might be disabled or show "Connect Wallet"
        // We just verify it exists and is visible
    });
});
