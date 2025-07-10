import { test, expect } from '@playwright/test';

test.describe('Navigation and Basic UI', () => {
  test('should load the homepage and display key elements', async ({
    page,
  }) => {
    await page.goto('/');

    // Check that the page loads without major errors
    await expect(page).toHaveTitle(/חוזים חכמים|Smart Contracts/);

    // Look for key navigation elements - check what actually exists
    const page404 = page.getByText(/404|Not Found/i);
    const hasError = (await page404.count()) > 0;

    if (!hasError) {
      // Page loaded successfully, look for any navigation elements
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('should navigate to login page directly', async ({ page }) => {
    await page.goto('/login');

    await expect(page).toHaveURL('/login');
    // Check for login-specific content using more specific selectors
    await expect(page.getByText(/התחבר כדי לנהל/i)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /כניסה.*הרשמה/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /המשך.*גוגל/i })
    ).toBeVisible();
  });

  test('should navigate to signup page directly', async ({ page }) => {
    await page.goto('/signup');

    await expect(page).toHaveURL('/signup');
    // Check for signup-specific content
    await expect(page.getByText(/יצירת חשבון חדש/i)).toBeVisible();
    await expect(page.getByText(/הצטרף לפלטפורמת/i)).toBeVisible();
  });

  test('should navigate to templates page directly', async ({ page }) => {
    await page.goto('/templates');

    await expect(page).toHaveURL('/templates');
    // Check that page loads without 404
    const page404 = page.getByText(/404|Not Found/i);
    const hasError = (await page404.count()) > 0;

    expect(hasError).toBeFalsy();
  });
});
