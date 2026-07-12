import { expect, test } from "@playwright/test";

import { addToCart, fillShippingAddress } from "./helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

test("cash on delivery checkout places the order @critical", async ({ page }) => {
  await addToCart(page, "aurora-pour-over-kettle");

  await page.goto("/checkout");
  await fillShippingAddress(page);
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();

  // €64.90 clears the €50 free-shipping threshold.
  await expect(page.getByText("Free").first()).toBeVisible();

  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByRole("heading", { name: "Thank you — your order is placed" }),
  ).toBeVisible();
  await expect(page.getByText(/SO-\d+/)).toBeVisible();
  await expect(page.getByText(/pay the courier/i)).toBeVisible();

  // The cart is emptied by a successful checkout.
  await expect(page.getByRole("button", { name: "Open cart (0 items)" })).toBeVisible();
});
