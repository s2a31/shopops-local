import { expect, test } from "@playwright/test";

import { DEMO_CUSTOMER, signIn } from "./helpers";

test("a customer is blocked from the admin area @critical", async ({ page }) => {
  await signIn(page, DEMO_CUSTOMER);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Permission denied" })).toBeVisible();

  // The API enforces the same boundary with a 403 envelope.
  const response = await page.request.get("/api/admin/orders");
  expect(response.status()).toBe(403);
  const body = await response.json();
  expect(body.error.code).toBe("FORBIDDEN");
});

test("a guest gets 401 from admin APIs and a login redirect from pages", async ({ page }) => {
  const response = await page.request.get("/api/admin/orders");
  expect(response.status()).toBe(401);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login/);
});
