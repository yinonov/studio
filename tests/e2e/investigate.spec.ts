import { test, expect } from "@playwright/test";

test.describe("Page Content Investigation", () => {
  test("investigate login page content", async ({ page }) => {
    await page.goto("/login");

    // Get page content to understand structure
    const title = await page.title();
    const headings = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .allTextContents();
    const inputs = await page.locator("input").count();
    const buttons = await page.locator("button").count();
    const bodyText = await page.locator("body").textContent();

    console.log("Login page investigation:");
    console.log("Title:", title);
    console.log("Headings:", headings);
    console.log("Input count:", inputs);
    console.log("Button count:", buttons);
    console.log("Body text (first 200 chars):", bodyText?.substring(0, 200));

    // Always pass this test - it's just for investigation
    expect(true).toBeTruthy();
  });

  test("investigate signup page content", async ({ page }) => {
    await page.goto("/signup");

    // Get page content to understand structure
    const title = await page.title();
    const headings = await page
      .locator("h1, h2, h3, h4, h5, h6")
      .allTextContents();
    const inputs = await page.locator("input").count();
    const buttons = await page.locator("button").count();
    const bodyText = await page.locator("body").textContent();

    console.log("Signup page investigation:");
    console.log("Title:", title);
    console.log("Headings:", headings);
    console.log("Input count:", inputs);
    console.log("Button count:", buttons);
    console.log("Body text (first 200 chars):", bodyText?.substring(0, 200));

    // Always pass this test - it's just for investigation
    expect(true).toBeTruthy();
  });
});
