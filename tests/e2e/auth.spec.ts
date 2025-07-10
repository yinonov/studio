import { test, expect } from "@playwright/test";

test.describe("Authentication Flow", () => {
  test.describe("Login Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/login");
    });

    test("should display login form elements", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /התחברות/i })
      ).toBeVisible();

      // Check for email/phone toggle
      await expect(page.getByText(/אימייל/i)).toBeVisible();
      await expect(page.getByText(/טלפון/i)).toBeVisible();

      // Check for input fields
      await expect(page.getByRole("textbox")).toBeVisible();
      await expect(page.getByRole("button", { name: /התחבר/i })).toBeVisible();
    });

    test("should switch between email and phone authentication", async ({
      page,
    }) => {
      // Default should be email
      await expect(page.getByPlaceholder(/אימייל/i)).toBeVisible();

      // Switch to phone
      await page.getByText(/טלפון/i).click();
      await expect(page.getByPlaceholder(/טלפון/i)).toBeVisible();

      // Switch back to email
      await page.getByText(/אימייל/i).click();
      await expect(page.getByPlaceholder(/אימייל/i)).toBeVisible();
    });

    test("should show validation errors for invalid email", async ({
      page,
    }) => {
      await page.getByPlaceholder(/אימייל/i).fill("invalid-email");
      await page.getByRole("button", { name: /התחבר/i }).click();

      // Look for error message
      await expect(page.getByText(/שגיאה/i)).toBeVisible();
    });

    test("should redirect to signup page", async ({ page }) => {
      await page.getByRole("link", { name: /הרשמה/i }).click();
      await expect(page).toHaveURL("/signup");
    });
  });

  test.describe("Signup Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/signup");
    });

    test("should display signup form elements", async ({ page }) => {
      await expect(page.getByRole("heading", { name: /הרשמה/i })).toBeVisible();

      // Check for form fields
      await expect(page.getByPlaceholder(/שם מלא/i)).toBeVisible();
      await expect(page.getByPlaceholder(/אימייל/i)).toBeVisible();
      await expect(page.getByPlaceholder(/סיסמה/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /הרשם/i })).toBeVisible();
    });

    test("should redirect to login page", async ({ page }) => {
      await page.getByRole("link", { name: /התחברות/i }).click();
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Protected Routes", () => {
    test("should redirect to login when accessing dashboard without auth", async ({
      page,
    }) => {
      await page.goto("/dashboard");

      // Should be redirected to login with redirect parameter
      await expect(page).toHaveURL(/\/login\?redirect=.*dashboard/);
    });

    test("should redirect to login when accessing contract creation without auth", async ({
      page,
    }) => {
      await page.goto("/templates/rental/create");

      // Should be redirected to login or show auth required message
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
