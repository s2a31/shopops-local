import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

async function expectNoSeriousViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "serious" || v.impact === "critical",
  );
  expect(blocking.map((v) => `${v.id}: ${v.help} (${v.nodes.length} nodes)`)).toEqual([]);
}

test.describe("axe: admin", () => {
  test("dashboard", async ({ page }) => {
    await page.goto("/admin");
    await expectNoSeriousViolations(page);
  });

  test("products table", async ({ page }) => {
    await page.goto("/admin/products");
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("inventory", async ({ page }) => {
    await page.goto("/admin/inventory");
    await expect(page.getByRole("table").first()).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("orders table", async ({ page }) => {
    await page.goto("/admin/orders");
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoSeriousViolations(page);
  });

  test("customers table", async ({ page }) => {
    await page.goto("/admin/customers");
    await expect(page.getByRole("table")).toBeVisible();
    await expectNoSeriousViolations(page);
  });
});
