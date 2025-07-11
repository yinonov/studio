import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/חוזים חכמים|Smart Contracts/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL('/login');
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('/signup');
    await expect(page).toHaveURL('/signup');
  });

  test('should navigate to templates page', async ({ page }) => {
    await page.goto('/templates');
    await expect(page).toHaveURL('/templates');
  });
});
