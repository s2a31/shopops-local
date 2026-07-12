import { expect, test } from "@playwright/test";

import { uniqueEmail } from "./helpers";

test("registration signs the new customer in @critical", async ({ page }) => {
  const email = uniqueEmail("register");

  await page.goto("/register");
  await page.getByLabel("Name").fill("Playwright Shopper");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("PlaywrightPass123!");
  await page.getByRole("button", { name: "Create account" }).click();

  // Auto-login lands on the storefront with the account menu present.
  // (exact: true — otherwise "Create account" on the register page matches.)
  await page.waitForURL("/");
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible();

  // The account page proves the session belongs to the new customer.
  await page.goto("/account");
  await expect(page.getByText("Playwright Shopper")).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});

test("registration rejects a taken email inline", async ({ page }) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Duplicate");
  await page.getByLabel("Email").fill("customer@shopops.local");
  await page.getByLabel("Password").fill("PlaywrightPass123!");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText(/already registered|already exists|in use/i)).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});
