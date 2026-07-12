import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { addToCart } from "../helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

/** Serious and critical axe violations fail the build; the rest are advisory. */
async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
}

test.describe("axe: storefront", () => {
  test("home", async ({ page }) => {
    await page.goto("/");
    await expectNoSeriousViolations(page);
  });

  test("product list", async ({ page }) => {
    await page.goto("/products");
    await expectNoSeriousViolations(page);
  });

  test("product detail", async ({ page }) => {
    await page.goto("/products/halo-desk-lamp");
    await expectNoSeriousViolations(page);
  });

  test("cart with contents", async ({ page }) => {
    await addToCart(page, "halo-desk-lamp");
    await page.goto("/cart");
    await expect(page.getByRole("link", { name: "Halo Desk Lamp" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("checkout", async ({ page }) => {
    await addToCart(page, "halo-desk-lamp");
    await page.goto("/checkout");
    await expect(page.getByRole("button", { name: "Place order" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test.describe("as guest", () => {
    // Signed-in visitors are redirected away from /login — scan it logged out.
    test.use({ storageState: { cookies: [], origins: [] } });

    test("login", async ({ page }) => {
      await page.goto("/login");
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expectNoSeriousViolations(page);
    });
  });

  test("account orders", async ({ page }) => {
    await page.goto("/account/orders");
    await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
