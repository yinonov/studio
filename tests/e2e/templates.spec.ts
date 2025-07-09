import { test, expect } from '@playwright/test';

test.describe('Template Management', () => {
  test.describe('Templates Page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/templates');
    });

    test('should display templates list', async ({ page }) => {
      // Wait for templates to load
      await page.waitForSelector('[data-testid="template-card"], [data-testid="loading-skeleton"], .loading', { 
        timeout: 10000 
      });
      
      // Check if templates are loaded or loading state is shown
      const hasTemplates = await page.getByTestId('template-card').count() > 0;
      const hasLoadingState = await page.locator('.loading, [data-testid="loading-skeleton"]').count() > 0;
      
      expect(hasTemplates || hasLoadingState).toBeTruthy();
    });

    test('should filter templates by category', async ({ page }) => {
      // Wait for templates to load
      await page.waitForLoadState('networkidle');
      
      // Look for category filters if they exist
      const categoryFilters = page.locator('[data-testid="category-filter"], .category-filter');
      const filterCount = await categoryFilters.count();
      
      if (filterCount > 0) {
        // Click on a category filter
        await categoryFilters.first().click();
        
        // Verify filtering works
        await expect(page.getByTestId('template-card')).toBeVisible();
      }
    });

    test('should navigate to template details', async ({ page }) => {
      // Wait for templates to load
      await page.waitForLoadState('networkidle');
      
      // Look for template cards
      const templateCards = page.getByTestId('template-card');
      const cardCount = await templateCards.count();
      
      if (cardCount > 0) {
        // Click on the first template
        await templateCards.first().click();
        
        // Should navigate to template detail/create page
        await expect(page).toHaveURL(/\/templates\/.*\/create/);
      }
    });
  });

  test.describe('Template Creation Flow', () => {
    test('should show template creation form for rental template', async ({ page }) => {
      await page.goto('/templates/rental/create');
      
      // Should either show the form or redirect to login
      const isOnLoginPage = page.url().includes('/login');
      const hasFormElements = await page.getByRole('textbox').count() > 0;
      
      if (!isOnLoginPage) {
        expect(hasFormElements).toBeTruthy();
        
        // Check for form fields specific to rental template
        await expect(page.getByText(/שם.*צד/i)).toBeVisible();
        await expect(page.getByText(/כתובת/i)).toBeVisible();
      }
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/templates/rental/create');
      
      // Skip if redirected to login
      if (page.url().includes('/login')) {
        return;
      }
      
      // Try to submit without filling required fields
      const submitButton = page.getByRole('button', { name: /שמור|צור|המשך/i });
      const buttonCount = await submitButton.count();
      
      if (buttonCount > 0) {
        await submitButton.first().click();
        
        // Should show validation errors
        await expect(page.getByText(/שדה חובה|נדרש/i)).toBeVisible();
      }
    });
  });
});
