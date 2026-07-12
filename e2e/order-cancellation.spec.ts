import { expect, test } from "@playwright/test";

import { placeCodOrderViaApi, productIdBySlug } from "./helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

const SLUG = "compass-enamel-mug-set";

async function stockOf(page: import("@playwright/test").Page, slug: string): Promise<number> {
  const response = await page.request.get(`/api/products/${slug}`);
  const body = await response.json();
  return body.product.stockQuantity;
}

test("cancelling an eligible order restores stock, visibly in admin", async ({ page, browser }) => {
  const productId = await productIdBySlug(page, SLUG);
  const stockBefore = await stockOf(page, SLUG);

  // A dedicated fresh order keeps this spec independent and retry-safe.
  const { orderId, orderNumber } = await placeCodOrderViaApi(page, [{ productId, quantity: 2 }]);
  expect(await stockOf(page, SLUG)).toBe(stockBefore - 2);

  await page.goto(`/account/orders/${orderId}`);
  await page.getByRole("button", { name: "Cancel order" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`Cancel order ${orderNumber}?`);
  await dialog.getByRole("button", { name: "Cancel order" }).click();

  // The success toast confirms the transaction committed (a loose "Cancelled"
  // match would already hit static page copy while the mutation is in flight),
  // and the refreshed page shows the terminal status badge.
  await expect(
    page.getByText(`Order ${orderNumber} cancelled. The items are back in stock.`),
  ).toBeVisible();
  await expect(page.getByText("Cancelled", { exact: true }).first()).toBeVisible();
  expect(await stockOf(page, SLUG)).toBe(stockBefore);

  // The restoration is auditable in the admin inventory ledger — checked from
  // a second, admin-authenticated context.
  const adminContext = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
  const adminPage = await adminContext.newPage();
  await adminPage.goto("/admin/inventory");
  await expect(
    adminPage
      .getByRole("row")
      .filter({ hasText: orderNumber })
      .filter({ hasText: "Order cancelled" }),
  ).toBeVisible();
  await adminContext.close();
});
