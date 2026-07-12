import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/admin.json" });

test("a newly created product appears in the storefront", async ({ page }) => {
  const name = `Playwright Test Lamp ${Date.now()}`;
  await page.goto("/admin/products/new");

  await page.getByLabel("Name", { exact: true }).fill(name);
  await page
    .getByLabel("Description")
    .fill("A fixture product created by the E2E suite to prove the admin-to-storefront path.");
  await page.getByLabel("Price (€)").fill("12.50");
  await page.getByLabel("Category").selectOption({ label: "Lighting" });
  await page.getByLabel("Initial stock").fill("7");
  await page.getByRole("button", { name: "Create product" }).click();

  await expect(page.getByText(`Created ${name}.`)).toBeVisible();

  // The storefront finds it immediately.
  await page.goto(`/products?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  await expect(page.getByText("€12.50")).toBeVisible();
});
