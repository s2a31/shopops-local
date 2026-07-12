import { expect, test } from "@playwright/test";

test("product search narrows the catalogue and survives the URL", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText(/\d+ products? found/)).toBeVisible();

  await page.getByLabel("Search").fill("kettle");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/q=kettle/);
  await expect(page.getByRole("link", { name: /Aurora Pour-Over Kettle/ })).toBeVisible();
  await expect(page.getByText("1 product found.")).toBeVisible();

  // The URL alone reproduces the result (shareable, back-button-safe).
  await page.goto("/products?q=kettle");
  await expect(page.getByRole("link", { name: /Aurora Pour-Over Kettle/ })).toBeVisible();
});

test("a search with no hits shows the designed empty state", async ({ page }) => {
  await page.goto("/products?q=zzzznothing");
  await expect(page.getByText("No products found.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nothing matches these filters" })).toBeVisible();
});
