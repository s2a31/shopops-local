import { expect, test } from "@playwright/test";

import { fillShippingAddress } from "./helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

// Runs only in the `mobile` Playwright project (iPhone 14 viewport).
test("mobile browse → cart → checkout completes", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByText(/\d+ products? found/)).toBeVisible();
  // The page never scrolls horizontally on a phone.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);

  await page.goto("/products/terra-serving-board");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("button", { name: "Open cart (1 item)" })).toBeVisible();

  await page.goto("/checkout");
  await fillShippingAddress(page);
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByRole("heading", { name: "Thank you — your order is placed" }),
  ).toBeVisible();
});
