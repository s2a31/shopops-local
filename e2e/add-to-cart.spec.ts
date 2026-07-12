import { expect, test } from "@playwright/test";

import { addToCart } from "./helpers";

test("adding a product updates the cart and persists across a reload", async ({ page }) => {
  await addToCart(page, "ember-mug-duo");

  // Feedback is a toast plus the header badge; the drawer opens only on demand.
  await expect(page.getByText("Added Ember Mug Duo to cart")).toBeVisible();
  await page.getByRole("button", { name: "Open cart (1 item)" }).click();

  const drawer = page.getByRole("dialog", { name: "Shopping cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("link", { name: "Ember Mug Duo" })).toBeVisible();

  // Zustand persist: the cart lives in localStorage and survives a restart.
  await page.reload();
  await expect(page.getByRole("button", { name: "Open cart (1 item)" })).toBeVisible();
});

test("an out-of-stock product offers no add control", async ({ page }) => {
  await page.goto("/products/orbit-electric-grinder");
  await expect(page.getByText("Out of stock", { exact: true })).toBeVisible();
  await expect(page.getByText("This product is currently out of stock.")).toBeVisible();
  // The add-to-cart control is not rendered at all — stronger than disabling it.
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});
