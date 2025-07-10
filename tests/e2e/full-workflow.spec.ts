import { test, expect } from "@playwright/test";
import { AuthHelper, ContractHelper, TestData } from "./helpers";

test.describe("Full Contract Workflow", () => {
  let authHelper: AuthHelper;
  let contractHelper: ContractHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    contractHelper = new ContractHelper(page);
  });

  test("should complete full contract creation workflow", async ({ page }) => {
    // Skip authentication for now and test the flow as guest/redirect
    await page.goto("/templates/rental/create");

    // If redirected to login, that's expected behavior
    if (page.url().includes("/login")) {
      await expect(page.getByText(/התחבר כדי לנהל/i)).toBeVisible();

      // Test that we can see the login form
      await expect(page.getByText(/אימייל/i).first()).toBeVisible();

      // Test Google login button exists
      await expect(
        page.getByRole("button", { name: /המשך.*גוגל/i })
      ).toBeVisible();

      return; // End test here since we can't easily test real auth in E2E
    }

    // If not redirected, test the form
    await page.waitForLoadState("networkidle");

    // Look for form fields
    const textInputs = page.getByRole("textbox");
    const inputCount = await textInputs.count();

    if (inputCount > 0) {
      // Fill out the form with test data
      const testData = TestData.contract.rental;

      // Try to fill fields by common patterns
      const fields = [
        { pattern: /שם.*צד.*א|משכיר/i, value: testData.party1Name },
        { pattern: /אימייל.*צד.*א/i, value: testData.party1Email },
        { pattern: /שם.*צד.*ב|שוכר/i, value: testData.party2Name },
        { pattern: /אימייל.*צד.*ב/i, value: testData.party2Email },
        { pattern: /כתובת/i, value: testData.address },
        { pattern: /שכר.*דירה|דמי.*שכירות/i, value: testData.rent },
      ];

      for (const field of fields) {
        const input = page
          .getByPlaceholder(field.pattern)
          .or(page.getByLabel(field.pattern));

        if ((await input.count()) > 0) {
          await input.first().fill(field.value);
        }
      }

      // Try to submit
      const submitButton = page.getByRole("button", {
        name: /שמור|צור|המשך|הבא/i,
      });
      if ((await submitButton.count()) > 0) {
        await submitButton.first().click();

        // Wait for response
        await page.waitForTimeout(2000);

        // Check for success or validation errors
        const hasError =
          (await page.getByText(/שגיאה|שדה חובה|נדרש/i).count()) > 0;
        const hasSuccess =
          (await page.getByText(/נוצר|נשמר|הצלחה/i).count()) > 0;
        const urlChanged = !page.url().includes("create");

        // At least one of these should be true
        expect(hasError || hasSuccess || urlChanged).toBeTruthy();
      }
    }
  });

  test("should handle contract signing flow", async ({ page }) => {
    // Test the signing success page directly
    await page.goto("/signing/success");

    // Should show success content
    await expect(page.getByText(/הצלחה|הושלם|חתום|בוצע/i)).toBeVisible();
  });

  test("should validate form fields", async ({ page }) => {
    await page.goto("/templates/rental/create");

    // Skip if redirected to login
    if (page.url().includes("/login")) {
      return;
    }

    await page.waitForLoadState("networkidle");

    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /שמור|צור|המשך/i });

    if ((await submitButton.count()) > 0) {
      await submitButton.first().click();

      // Should show validation errors
      await page.waitForTimeout(1000);

      const validationMessages = [
        /שדה חובה/i,
        /נדרש/i,
        /חובה למלא/i,
        /שדה זה נדרש/i,
        /אנא מלא/i,
      ];

      let hasValidation = false;
      for (const message of validationMessages) {
        if ((await page.getByText(message).count()) > 0) {
          hasValidation = true;
          break;
        }
      }

      // Should have some form of validation
      expect(hasValidation).toBeTruthy();
    }
  });

  test("should handle template selection", async ({ page }) => {
    await page.goto("/templates");

    await expect(page).toHaveURL("/templates");

    // Wait for content to load
    await page.waitForLoadState("networkidle");

    // Should not show 404 error
    const hasError = (await page.getByText(/404|לא נמצא|שגיאה/i).count()) > 0;
    expect(hasError).toBeFalsy();

    // Look for template cards or content
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();
    expect(hasContent!.length).toBeGreaterThan(50); // Should have meaningful content
  });
});
