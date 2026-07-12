import { expect, test } from "@playwright/test";

test("category and price filters combine", async ({ page }) => {
  await page.goto("/products");

  await page.getByLabel("Category").selectOption({ label: "Lighting" });
  await page.getByLabel("Min price (€)").fill("30");
  await page.getByLabel("Max price (€)").fill("50");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/category=lighting/);
  await expect(page).toHaveURL(/minPrice=30/);

  // Prism Accent Spotlight (€39.90, Lighting) is in range.
  await expect(page.getByRole("link", { name: /Prism Accent Spotlight/ })).toBeVisible();
  // Aurora Pour-Over Kettle (€64.90, Coffee & Tea) fails both filters.
  await expect(page.getByRole("link", { name: /Aurora Pour-Over Kettle/ })).toHaveCount(0);
});

test("sorting by price ascending orders the cards", async ({ page }) => {
  await page.goto("/products?category=coffee-tea&sort=price-asc");

  const prices = await page
    .getByText(/^€\d+\.\d\d$/)
    .allTextContents()
    .then((texts) => texts.map((t) => Number(t.replace("€", ""))));
  expect(prices.length).toBeGreaterThan(2);
  const sorted = [...prices].sort((a, b) => a - b);
  expect(prices).toEqual(sorted);
});
