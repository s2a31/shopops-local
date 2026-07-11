import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import type { CheckoutInput } from "@/features/checkout/schemas";
import { placeOrder } from "@/server/services/checkout.service";
import {
  cancelOrderForUser,
  getLatestShippingAddressForUser,
  getOrderForUser,
  listOrdersForUser,
  ORDERS_PAGE_SIZE,
} from "@/server/services/order.service";

import { resetDb } from "../helpers/db";

const ADDRESS = {
  name: "Ada Lovelace",
  phone: undefined,
  street: "1 Analytical Row",
  city: "Dublin",
  postalCode: "D01 F5P2",
  country: "Ireland",
};

let buyerId: string;
let otherId: string;
let lampId: string;

const order = (overrides: Partial<CheckoutInput> = {}, quantity = 1): CheckoutInput => ({
  items: [{ productId: lampId, quantity }],
  shippingAddress: ADDRESS,
  paymentMethod: "CASH_ON_DELIVERY",
  ...overrides,
});

beforeEach(async () => {
  await resetDb();
  const buyer = await prisma.user.create({
    data: { email: "buyer@example.com", passwordHash: "irrelevant-here", name: "Buyer" },
  });
  const other = await prisma.user.create({
    data: { email: "other@example.com", passwordHash: "irrelevant-here", name: "Other" },
  });
  buyerId = buyer.id;
  otherId = other.id;

  const category = await prisma.category.create({ data: { name: "Lighting", slug: "lighting" } });
  const lamp = await prisma.product.create({
    data: {
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      description: "Lamp",
      priceCents: 7990,
      stockQuantity: 100,
      categoryId: category.id,
    },
  });
  lampId = lamp.id;
});

describe("getOrderForUser", () => {
  it("returns the order to its owner and null to anyone else", async () => {
    const placed = await placeOrder(buyerId, order());
    await expect(getOrderForUser(buyerId, placed.orderId)).resolves.toMatchObject({
      orderNumber: placed.orderNumber,
    });
    await expect(getOrderForUser(otherId, placed.orderId)).resolves.toBeNull();
  });
});

describe("getLatestShippingAddressForUser", () => {
  it("returns null before the first order", async () => {
    await expect(getLatestShippingAddressForUser(buyerId)).resolves.toBeNull();
  });

  it("returns the most recent order's address", async () => {
    await placeOrder(buyerId, order());
    await placeOrder(
      buyerId,
      order({ shippingAddress: { ...ADDRESS, city: "Cork", street: "9 New Quay" } }),
    );

    await expect(getLatestShippingAddressForUser(buyerId)).resolves.toMatchObject({
      city: "Cork",
      street: "9 New Quay",
      phone: null,
    });
  });
});

describe("listOrdersForUser", () => {
  it("paginates newest first, scoped to the owner", async () => {
    for (let i = 0; i < ORDERS_PAGE_SIZE + 2; i += 1) {
      await placeOrder(buyerId, order());
    }
    await placeOrder(otherId, order());

    const firstPage = await listOrdersForUser(buyerId, 1);
    expect(firstPage.total).toBe(ORDERS_PAGE_SIZE + 2);
    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.items).toHaveLength(ORDERS_PAGE_SIZE);
    expect(firstPage.items[0]!.itemCount).toBe(1);
    // Newest first: order numbers descend down the page.
    const numbers = firstPage.items.map((o) => o.orderNumber);
    expect([...numbers].sort().reverse()).toEqual(numbers);

    const secondPage = await listOrdersForUser(buyerId, 2);
    expect(secondPage.items).toHaveLength(2);

    const otherOrders = await listOrdersForUser(otherId, 1);
    expect(otherOrders.total).toBe(1);
  });

  it("clamps page overflow to the last page", async () => {
    await placeOrder(buyerId, order());
    const result = await listOrdersForUser(buyerId, 99);
    expect(result.page).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});

describe("cancelOrderForUser", () => {
  it("cancels a PLACED COD order, restores stock, and writes ledger rows", async () => {
    const placed = await placeOrder(buyerId, order({}, 3));
    const before = await prisma.product.findUniqueOrThrow({ where: { id: lampId } });
    expect(before.stockQuantity).toBe(97);

    const cancelled = await cancelOrderForUser(buyerId, placed.orderId);
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.cancelledAt).not.toBeNull();
    expect(cancelled.paymentStatus).toBe("PENDING"); // COD was never paid

    const after = await prisma.product.findUniqueOrThrow({ where: { id: lampId } });
    expect(after.stockQuantity).toBe(100);

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { orderId: placed.orderId },
      orderBy: { createdAt: "asc" },
    });
    expect(adjustments.map((a) => ({ reason: a.reason, delta: a.delta }))).toEqual([
      { reason: "ORDER_PLACED", delta: -3 },
      { reason: "ORDER_CANCELLED", delta: 3 },
    ]);
  });

  it("flags a paid simulated-card payment as REFUNDED", async () => {
    const placed = await placeOrder(
      buyerId,
      order({ paymentMethod: "SIMULATED_CARD", simulatedOutcome: "APPROVE" }),
    );
    const cancelled = await cancelOrderForUser(buyerId, placed.orderId);
    expect(cancelled.paymentStatus).toBe("REFUNDED");
  });

  it("rejects orders that are no longer PLACED with CONFLICT", async () => {
    const placed = await placeOrder(buyerId, order());
    await prisma.order.update({ where: { id: placed.orderId }, data: { status: "PROCESSING" } });

    await expect(cancelOrderForUser(buyerId, placed.orderId)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const product = await prisma.product.findUniqueOrThrow({ where: { id: lampId } });
    expect(product.stockQuantity).toBe(99); // no restore happened
  });

  it("rejects a second cancellation without restoring stock twice", async () => {
    const placed = await placeOrder(buyerId, order({}, 2));
    await cancelOrderForUser(buyerId, placed.orderId);

    await expect(cancelOrderForUser(buyerId, placed.orderId)).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const product = await prisma.product.findUniqueOrThrow({ where: { id: lampId } });
    expect(product.stockQuantity).toBe(100);
  });

  it("treats another user's order as nonexistent", async () => {
    const placed = await placeOrder(buyerId, order());
    await expect(cancelOrderForUser(otherId, placed.orderId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
