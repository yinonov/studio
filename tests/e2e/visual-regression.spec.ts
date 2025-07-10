import { test, expect } from '@playwright/test';

// TODO: Re-enable when UI is stable and ready for visual regression testing
test.describe.skip('Visual Regression Tests', () => {
  test('homepage should match visual baseline', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Hide dynamic content that might change
    await page.addStyleTag({
      content: `
        [data-testid="timestamp"],
        .timestamp,
        .loading-spinner {
          visibility: hidden !important;
        }
      `,
    });

    // Take screenshot
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('login page should match visual baseline', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Hide any dynamic elements
    await page.addStyleTag({
      content: `
        .recaptcha-container,
        [data-testid="loading"] {
          visibility: hidden !important;
        }
      `,
    });

    await expect(page).toHaveScreenshot('login-page.png');
  });

  test('signup page should match visual baseline', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('signup-page.png');
  });

  test('templates page should match visual baseline', async ({ page }) => {
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    // Wait for templates to load or show loading state
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('templates-page.png');
  });

  test('mobile homepage should match visual baseline', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });

  test('contract creation form should match visual baseline', async ({
    page,
  }) => {
    await page.goto('/templates/rental/create');
    await page.waitForLoadState('networkidle');

    // If redirected to login, take screenshot of that instead
    if (page.url().includes('/login')) {
      await expect(page).toHaveScreenshot('contract-create-redirect.png');
    } else {
      await expect(page).toHaveScreenshot('contract-create-form.png');
    }
  });

  test('responsive design should work correctly', async ({ page }) => {
    await page.goto('/');

    // Test different viewport sizes
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop-large' },
      { width: 1366, height: 768, name: 'desktop-medium' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.waitForLoadState('networkidle');

      // Check that content is still visible and not cut off
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Check that navigation is accessible
      const nav = page.locator('nav, header, [role="navigation"]');
      if ((await nav.count()) > 0) {
        await expect(nav.first()).toBeVisible();
      }
    }
  });
});
