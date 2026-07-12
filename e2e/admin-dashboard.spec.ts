import { expect, test } from "@playwright/test";

import { DEMO_ADMIN } from "./helpers";

test("admin login through the UI reaches a populated dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_ADMIN.email);
  await page.getByLabel("Password").fill(DEMO_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Account" })).toBeVisible();

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  // Seeded fixture orders populate the summaries — revenue is a real amount.
  await expect(page.getByText(/€\d/).first()).toBeVisible();
  await expect(page.getByText(/low stock/i).first()).toBeVisible();
});
