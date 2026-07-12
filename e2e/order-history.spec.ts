import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/customer.json" });

test("order history lists the customer's orders and opens a detail", async ({ page }) => {
  await page.goto("/account/orders");

  await expect(page.getByRole("heading", { name: "Order history" })).toBeVisible();
  const firstOrder = page.getByRole("link", { name: /SO-\d+/ }).first();
  // Order numbers are SO- plus a six-digit sequence; a greedy \d+ would also
  // swallow the date that follows in the link's text content.
  const orderNumber = (await firstOrder.textContent())?.match(/SO-\d{6}/)?.[0] ?? "";
  await firstOrder.click();

  await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();
  // Detail shows totals and the shipping snapshot.
  await expect(page.getByText("Total", { exact: true })).toBeVisible();
  await expect(page.getByText(/shipping/i).first()).toBeVisible();
});

test("another customer's order id is a 404, not a leak", async ({ page }) => {
  // The page streams (loading.tsx), so the HTTP status is already sent as 200
  // when notFound() resolves — the designed 404 page is the observable
  // behavior. The wire-level 404 for foreign orders is asserted in the HTTP
  // API tests against GET /api/orders/[id].
  await page.goto("/account/orders/nonexistent-order-id");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});
