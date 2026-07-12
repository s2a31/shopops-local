import { expect, test } from "@playwright/test";

import { DEMO_ADMIN, DEMO_CUSTOMER, placeCodOrderViaApi, productIdBySlug, signIn } from "./helpers";

test("admin applies a valid transition; invalid moves are not offered @critical", async ({
  page,
}) => {
  // A dedicated fresh order keeps this spec independent and retry-safe.
  await signIn(page, DEMO_CUSTOMER);
  const productId = await productIdBySlug(page, "reverb-mini-speaker");
  const { orderId, orderNumber } = await placeCodOrderViaApi(page, [{ productId, quantity: 1 }]);

  await signIn(page, DEMO_ADMIN);
  await page.goto(`/admin/orders/${orderId}`);
  await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();

  // The machine allows exactly two moves out of PLACED.
  const select = page.getByLabel(`Change status for order ${orderNumber}`);
  await expect(select.getByRole("option")).toHaveText([
    "Pick the next status…",
    "Processing",
    "Cancelled",
  ]);

  await select.selectOption("PROCESSING");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(`${orderNumber} is now Processing.`)).toBeVisible();

  // After the transition the UI offers the next legal moves only.
  await expect(select.getByRole("option")).toHaveText([
    "Pick the next status…",
    "Shipped",
    "Cancelled",
  ]);

  // The server rejects an illegal jump even if a stale client submits one.
  const forged = await page.request.patch(`/api/admin/orders/${orderId}/status`, {
    headers: { Origin: process.env.APP_URL ?? "http://localhost:3100" },
    data: { status: "DELIVERED" },
  });
  expect(forged.status()).toBe(409);
});
