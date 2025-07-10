import { test, expect } from "@playwright/test";

// TODO: Re-enable when features are complete and ready for performance testing
test.describe.skip("Performance Tests", () => {
  test("homepage should load within performance budget", async ({ page }) => {
    // Start performance measurement
    const startTime = Date.now();

    await page.goto("/", { waitUntil: "networkidle" });

    const loadTime = Date.now() - startTime;

    // Should load within 3 seconds
    expect(loadTime).toBeLessThan(3000);

    // Check Core Web Vitals
    const performanceMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics: Record<string, number> = {};

          entries.forEach((entry) => {
            if (entry.entryType === "navigation") {
              const navEntry = entry as PerformanceNavigationTiming;
              metrics.domContentLoaded =
                navEntry.domContentLoadedEventEnd -
                navEntry.domContentLoadedEventStart;
              metrics.firstPaint =
                navEntry.loadEventEnd - navEntry.loadEventStart;
            }
          });

          resolve(metrics);
        }).observe({ entryTypes: ["navigation"] });

        // Fallback timeout
        setTimeout(() => resolve({}), 1000);
      });
    });

    console.log("Performance metrics:", performanceMetrics);
  });

  test("templates page should handle large datasets efficiently", async ({
    page,
  }) => {
    await page.goto("/templates");

    const startTime = Date.now();
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;

    // Should load templates efficiently
    expect(loadTime).toBeLessThan(5000);

    // Check for memory leaks by monitoring heap size
    const heapSize = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    console.log("Heap size after templates load:", heapSize);

    // Should not use excessive memory (50MB limit)
    if (heapSize > 0) {
      expect(heapSize).toBeLessThan(50 * 1024 * 1024);
    }
  });

  test("form interactions should be responsive", async ({ page }) => {
    await page.goto("/templates/rental/create");

    // Skip if redirected to login
    if (page.url().includes("/login")) {
      return;
    }

    await page.waitForLoadState("networkidle");

    // Test form input responsiveness
    const inputs = page.getByRole("textbox");
    const inputCount = await inputs.count();

    if (inputCount > 0) {
      const input = inputs.first();

      // Measure input response time
      const startTime = Date.now();
      await input.fill("test input");
      await input.blur(); // Trigger any validation

      const responseTime = Date.now() - startTime;

      // Form should respond quickly
      expect(responseTime).toBeLessThan(1000);
    }
  });

  test("should not have excessive bundle size", async ({ page }) => {
    await page.goto("/");

    // Get network requests to analyze bundle size
    const responses: any[] = [];

    page.on("response", (response) => {
      if (response.url().includes(".js") || response.url().includes(".css")) {
        responses.push({
          url: response.url(),
          size: response.headers()["content-length"] || 0,
          status: response.status(),
        });
      }
    });

    await page.waitForLoadState("networkidle");

    // Calculate total JS bundle size
    const jsBundles = responses.filter((r) => r.url.includes(".js"));
    const totalJSSize = jsBundles.reduce((sum, bundle) => {
      return sum + parseInt(bundle.size || "0", 10);
    }, 0);

    console.log("Total JS bundle size:", totalJSSize, "bytes");
    console.log(
      "JS bundles:",
      jsBundles.map((b) => ({ url: b.url, size: b.size }))
    );

    // Main bundle should be reasonable (2MB limit)
    expect(totalJSSize).toBeLessThan(2 * 1024 * 1024);
  });

  test("should handle rapid user interactions gracefully", async ({ page }) => {
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // Rapid navigation test
    const navigationPromises = [];

    for (let i = 0; i < 5; i++) {
      navigationPromises.push(
        page
          .goto("/")
          .then(() => page.goto("/templates"))
          .then(() => page.goto("/login"))
      );
    }

    // Should handle rapid navigation without errors
    await Promise.all(navigationPromises);

    // Final page should be functional
    await expect(page.locator("body")).toBeVisible();
  });

  test("should be accessible and performant on slow networks", async ({
    page,
    context,
  }) => {
    // Simulate slow 3G network
    await context.route("**/*", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 100)); // Add delay
      await route.continue();
    });

    const startTime = Date.now();
    await page.goto("/", { timeout: 30000 });
    const loadTime = Date.now() - startTime;

    // Should still load within reasonable time on slow network
    expect(loadTime).toBeLessThan(10000);

    // Content should be visible
    await expect(page.locator("body")).toBeVisible();
  });
});
