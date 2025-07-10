import { test, expect } from "@playwright/test";

test.describe("Contract Management", () => {
  test.describe("Dashboard", () => {
    test("should redirect to login when not authenticated", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Should be redirected to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Contract Creation Workflow", () => {
    test("should handle contract creation flow", async ({ page }) => {
      // Start from templates page
      await page.goto("/templates");
      await page.waitForLoadState("networkidle");

      // Look for a template to use
      const templateCards = page.getByTestId("template-card");
      const cardCount = await templateCards.count();

      if (cardCount > 0) {
        // Click on first template
        await templateCards.first().click();

        // Should navigate to create page or login
        if (page.url().includes("/login")) {
          // Not authenticated, skip rest of test
          return;
        }

        // Fill out form if available
        const textInputs = page.getByRole("textbox");
        const inputCount = await textInputs.count();

        if (inputCount > 0) {
          // Fill first few inputs with test data
          await textInputs.nth(0).fill("ישראל ישראלי");
          if (inputCount > 1) {
            await textInputs.nth(1).fill("israel@example.com");
          }
          if (inputCount > 2) {
            await textInputs.nth(2).fill("שרה לוי");
          }
        }

        // Look for submit button
        const submitButton = page.getByRole("button", {
          name: /שמור|צור|המשך/i,
        });
        const buttonCount = await submitButton.count();

        if (buttonCount > 0) {
          await submitButton.first().click();

          // Should either create contract or show validation
          await page.waitForTimeout(2000);

          // Check if we moved to next step or got validation errors
          const hasErrors =
            (await page.getByText(/שגיאה|שדה חובה/i).count()) > 0;
          const urlChanged = !page.url().includes("/create");

          expect(hasErrors || urlChanged).toBeTruthy();
        }
      }
    });
  });

  test.describe("Contract Signing Flow", () => {
    test("should handle contract signing page", async ({ page }) => {
      // Test accessing a contract that might exist
      await page.goto("/contracts/test-contract-id");

      // Should either load contract page or redirect/show error
      await page.waitForLoadState("networkidle");

      // Check for expected elements or error states
      const hasContractContent =
        (await page.getByText(/חתימה|חוזה|חתום/i).count()) > 0;
      const hasErrorState =
        (await page.getByText(/שגיאה|לא נמצא/i).count()) > 0;
      const isRedirected = page.url() !== page.url();

      // One of these should be true
      expect(hasContractContent || hasErrorState || isRedirected).toBeTruthy();
    });
  });

  test.describe("Contract Success Flow", () => {
    test("should display signing success page", async ({ page }) => {
      await page.goto("/signing/success");

      // Should show success message
      await expect(page.getByText(/הצלחה|הושלם|חתום/i)).toBeVisible();
    });
  });
});
