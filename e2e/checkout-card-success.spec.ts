import { expect, test } from "@playwright/test";

import { addToCart, fillShippingAddress } from "./helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

test("approving demo card checkout pays the order @critical", async ({ page }) => {
  await addToCart(page, "cascade-ceramic-dripper");

  await page.goto("/checkout");
  await fillShippingAddress(page);
  await page.getByRole("radio", { name: /Simulated card/ }).check();
  await page.getByRole("radio", { name: /Demo card — approves/ }).check();

  await page.getByRole("button", { name: "Place order" }).click();

  await expect(
    page.getByRole("heading", { name: "Thank you — your order is placed" }),
  ).toBeVisible();
  // Simulated payments carry a fake reference and an explicit disclaimer.
  await expect(page.getByText(/simulated demo payment/i)).toBeVisible();
  await expect(page.getByText(/SIM-/)).toBeVisible();
});
