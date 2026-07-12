import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { SINGLE_UNIT_PRODUCT, fillShippingAddress } from "./helpers";

test.use({ storageState: "e2e/.auth/customer.json" });

const ORIGIN = process.env.APP_URL ?? "http://localhost:3100";

async function readProduct(
  request: APIRequestContext,
  slug: string,
): Promise<{ id: string; stock: number }> {
  const response = await request.get(`/api/products/${slug}`);
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return { id: body.product.id, stock: body.product.stockQuantity };
}

/**
 * Pins the fixture product to an exact stock level through the audited admin
 * adjustment API, so both tests are self-healing across retries no matter how
 * a previous attempt left the stock.
 */
async function setStock(
  admin: APIRequestContext,
  productId: string,
  current: number,
  target: number,
): Promise<void> {
  if (current === target) return;
  const response = await admin.post("/api/admin/inventory/adjustments", {
    headers: { Origin: ORIGIN },
    data: {
      productId,
      delta: target - current,
      reason: "MANUAL_CORRECTION",
      note: "E2E insufficient-stock fixture",
    },
  });
  expect(response.status(), await response.text()).toBe(201);
}

/** Seeds the persisted cart before the app boots, simulating a stale cart. */
async function seedCart(page: Page, productId: string, quantity: number): Promise<void> {
  await page.goto("/");
  await page.evaluate(
    ([id, qty]) => {
      window.localStorage.setItem(
        "shopops-cart",
        JSON.stringify({
          state: { items: [{ productId: id, quantity: Number(qty) }] },
          version: 1,
        }),
      );
    },
    [productId, String(quantity)],
  );
}

test("a cart holding more units than stock is caught before the server @critical", async ({
  page,
  browser,
}) => {
  const admin = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
  const product = await readProduct(page.request, SINGLE_UNIT_PRODUCT.slug);
  await setStock(admin.request, product.id, product.stock, 1);

  await seedCart(page, product.id, 2);

  // The cart page flags the shortfall and offers the one-click fix.
  await page.goto("/cart");
  await expect(page.getByRole("alert").filter({ hasText: "Only 1 in stock." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Set quantity to 1" })).toBeVisible();

  // Checkout refuses to submit while a line is short.
  await page.goto("/checkout");
  await expect(
    page.getByRole("alert").filter({ hasText: /not available as requested/ }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Place order" })).toBeDisabled();

  await admin.close();
});

test("losing the last unit mid-checkout renders the server's 409 usably @critical", async ({
  page,
  browser,
}) => {
  const admin = await browser.newContext({ storageState: "e2e/.auth/admin.json" });
  const product = await readProduct(page.request, SINGLE_UNIT_PRODUCT.slug);
  await setStock(admin.request, product.id, product.stock, 1);

  // One unit requested, one in stock — validation passes and checkout opens.
  await seedCart(page, product.id, 1);
  await page.goto("/checkout");
  await fillShippingAddress(page);
  await page.getByRole("radio", { name: /Cash on delivery/ }).check();
  await expect(page.getByRole("button", { name: "Place order" })).toBeEnabled();

  // Another shopper takes the last unit while this one hesitates.
  await setStock(admin.request, product.id, 1, 0);

  await page.getByRole("button", { name: "Place order" }).click();

  // The transactional decrement fails, no order is created, and the 409
  // renders per-line availability inline on the checkout page.
  await expect(page.getByRole("alert").filter({ hasText: SINGLE_UNIT_PRODUCT.name })).toBeVisible();
  await expect(page).toHaveURL(/\/checkout/);

  // The cart is untouched, ready to adjust after the failure.
  await expect(page.getByRole("button", { name: "Open cart (1 item)" })).toBeVisible();

  await admin.close();
});
