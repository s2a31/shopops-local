import { expect, test } from "@playwright/test";

import { addToCart } from "./helpers";

test("quantity changes and removal update the cart page", async ({ page }) => {
  await addToCart(page, "ember-mug-duo");
  await page.goto("/cart");

  await expect(page.getByRole("link", { name: "Ember Mug Duo" })).toBeVisible();

  await page.getByRole("button", { name: "Increase quantity of Ember Mug Duo" }).click();
  await expect(page.getByLabel(/Quantity of Ember Mug Duo/)).toHaveValue("2");
  // €34.90 × 2 appears in the summary as the subtotal.
  await expect(page.getByText("€69.80").first()).toBeVisible();

  await page.getByRole("button", { name: "Decrease quantity of Ember Mug Duo" }).click();
  await expect(page.getByLabel(/Quantity of Ember Mug Duo/)).toHaveValue("1");

  await page.getByRole("button", { name: "Remove Ember Mug Duo from cart" }).click();
  await expect(page.getByText(/your cart is empty/i)).toBeVisible();
});
