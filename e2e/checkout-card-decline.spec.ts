import { expect, test } from "@playwright/test";

import { addToCart, fillShippingAddress } from "./helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

test("declined demo card leaves no order and keeps the cart @critical", async ({ page }) => {
  await addToCart(page, "verdant-loose-leaf-sampler");

  await page.goto("/checkout");
  await fillShippingAddress(page);
  await page.getByRole("radio", { name: /Simulated card/ }).check();
  await page.getByRole("radio", { name: /Demo card — declines/ }).check();

  await page.getByRole("button", { name: "Place order" }).click();

  // Inline decline explanation; still on the checkout page. (Next's route
  // announcer is also role=alert, so scope by content.)
  await expect(page.getByRole("alert").filter({ hasText: /declined/i })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);

  // Cart intact — the same line survives, ready for a retry.
  await expect(page.getByRole("button", { name: "Open cart (1 item)" })).toBeVisible();
  await page.goto("/cart");
  await expect(page.getByRole("link", { name: "Verdant Loose-Leaf Sampler" })).toBeVisible();
});
