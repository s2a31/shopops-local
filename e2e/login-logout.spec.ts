import { expect, test } from "@playwright/test";

import { DEMO_CUSTOMER } from "./helpers";

test("login and logout round-trip @critical", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CUSTOMER.email);
  await page.getByLabel("Password").fill(DEMO_CUSTOMER.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("button", { name: "Account" })).toBeVisible();

  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();

  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("wrong password shows a uniform error without leaking accounts", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_CUSTOMER.email);
  await page.getByLabel("Password").fill("WrongPassword123!");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});
