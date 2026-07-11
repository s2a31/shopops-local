import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { SHIPPING_FEE_CENTS } from "@/lib/money";

import { placeOrder } from "@/server/services/checkout.service";
import type { CheckoutInput } from "@/features/checkout/schemas";

import { resetDb } from "../helpers/db";

const ADDRESS = {
  name: "Ada Lovelace",
  phone: undefined,
  street: "1 Analytical Row",
  city: "Dublin",
  postalCode: "D01 F5P2",
  country: "Ireland",
};

const cod = (items: CheckoutInput["items"]): CheckoutInput => ({
  items,
  shippingAddress: ADDRESS,
  paymentMethod: "CASH_ON_DELIVERY",
});

const card = (
  items: CheckoutInput["items"],
  simulatedOutcome: "APPROVE" | "DECLINE",
): CheckoutInput => ({
  items,
  shippingAddress: ADDRESS,
  paymentMethod: "SIMULATED_CARD",
  simulatedOutcome,
});

let userId: string;
let ids: Record<string, string>;

beforeEach(async () => {
  await resetDb();
  const user = await prisma.user.create({
    data: { email: "buyer@example.com", passwordHash: "irrelevant-here", name: "Buyer" },
  });
  userId = user.id;

  const category = await prisma.category.create({ data: { name: "Lighting", slug: "lighting" } });
  const make = (
    name: string,
    slug: string,
    priceCents: number,
    stockQuantity: number,
    isActive = true,
  ) =>
    prisma.product.create({
      data: {
        name,
        slug,
        description: name,
        priceCents,
        stockQuantity,
        isActive,
        categoryId: category.id,
      },
    });

  const lamp = await make("Halo Desk Lamp", "halo-desk-lamp", 7990, 26);
  const lantern = await make("Beacon Lantern", "beacon-lantern", 4490, 2);
  const radio = await make("Retro FM Radio", "retro-fm-radio", 6490, 0);
  const hidden = await make("Hidden Lamp", "hidden-lamp", 999, 10, false);
  const lastUnit = await make("Final Floor Lamp", "final-floor-lamp", 2990, 1);
  ids = {
    lamp: lamp.id,
    lantern: lantern.id,
    radio: radio.id,
    hidden: hidden.id,
    lastUnit: lastUnit.id,
  };
});

describe("placeOrder — cash on delivery", () => {
  it("creates a PLACED order with PENDING payment, snapshots, stock decrement and ledger entry", async () => {
    const placed = await placeOrder(userId, cod([{ productId: ids.lantern!, quantity: 1 }]));

    expect(placed.orderNumber).toBe("SO-001042"); // sequence restarts at 1042 in resetDb

    const order = await prisma.order.findUniqueOrThrow({
      where: { id: placed.orderId },
      include: { items: true },
    });
    expect(order).toMatchObject({
      userId,
      status: "PLACED",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
      paymentRef: null,
      subtotalCents: 4490,
      shippingCents: SHIPPING_FEE_CENTS,
      totalCents: 4490 + SHIPPING_FEE_CENTS,
      shippingName: ADDRESS.name,
      shippingStreet: ADDRESS.street,
      shippingCity: ADDRESS.city,
      shippingPostalCode: ADDRESS.postalCode,
      shippingCountry: ADDRESS.country,
      shippingPhone: null,
    });
    expect(order.items).toHaveLength(1);
    expect(order.items[0]).toMatchObject({
      productId: ids.lantern,
      productName: "Beacon Lantern",
      unitPriceCents: 4490,
      quantity: 1,
      lineTotalCents: 4490,
    });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: ids.lantern! } });
    expect(product.stockQuantity).toBe(1);

    const adjustments = await prisma.inventoryAdjustment.findMany();
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      productId: ids.lantern,
      delta: -1,
      reason: "ORDER_PLACED",
      orderId: placed.orderId,
      actorUserId: null,
    });
  });

  it("ships free at or above the threshold", async () => {
    const placed = await placeOrder(userId, cod([{ productId: ids.lamp!, quantity: 1 }]));
    const order = await prisma.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(order.subtotalCents).toBe(7990);
    expect(order.shippingCents).toBe(0);
    expect(order.totalCents).toBe(7990);
  });

  it("merges duplicate product lines into one order item", async () => {
    const placed = await placeOrder(
      userId,
      cod([
        { productId: ids.lamp!, quantity: 1 },
        { productId: ids.lamp!, quantity: 2 },
      ]),
    );
    const items = await prisma.orderItem.findMany({ where: { orderId: placed.orderId } });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ quantity: 3, lineTotalCents: 3 * 7990 });
  });
});

describe("placeOrder — simulated card", () => {
  it("APPROVE creates a PAID order with a simulated payment reference", async () => {
    const placed = await placeOrder(
      userId,
      card([{ productId: ids.lamp!, quantity: 1 }], "APPROVE"),
    );
    const order = await prisma.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(order.paymentStatus).toBe("PAID");
    expect(order.paymentRef).toMatch(/^SIM-[0-9a-f]{8}$/);
  });

  it("DECLINE rejects with PAYMENT_DECLINED and writes nothing at all", async () => {
    await expect(
      placeOrder(userId, card([{ productId: ids.lamp!, quantity: 2 }], "DECLINE")),
    ).rejects.toMatchObject({ code: "PAYMENT_DECLINED" });

    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.orderItem.count()).toBe(0);
    expect(await prisma.inventoryAdjustment.count()).toBe(0);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: ids.lamp! } });
    expect(product.stockQuantity).toBe(26);
  });
});

describe("placeOrder — availability failures roll back everything", () => {
  it("rejects insufficient stock with per-line availability details", async () => {
    const rejection = await placeOrder(userId, cod([{ productId: ids.lantern!, quantity: 5 }]))
      .then(() => null)
      .catch((e: unknown) => e as { code: string; details: { lines: unknown[] } });

    expect(rejection?.code).toBe("INSUFFICIENT_STOCK");
    expect(rejection?.details.lines).toEqual([
      {
        productId: ids.lantern,
        productName: "Beacon Lantern",
        problem: "INSUFFICIENT_STOCK",
        availableQuantity: 2,
      },
    ]);
    expect(await prisma.order.count()).toBe(0);
  });

  it("rejects inactive and missing products with CONFLICT and per-line problems", async () => {
    const rejection = await placeOrder(
      userId,
      cod([
        { productId: ids.hidden!, quantity: 1 },
        { productId: "no-such-product", quantity: 1 },
      ]),
    )
      .then(() => null)
      .catch((e: unknown) => e as { code: string; details: { lines: { problem: string }[] } });

    expect(rejection?.code).toBe("CONFLICT");
    const problems = rejection?.details.lines.map((l) => l.problem).sort();
    expect(problems).toEqual(["INACTIVE", "MISSING"]);
    expect(await prisma.order.count()).toBe(0);
  });

  it("a failing line rolls back the healthy lines' stock too", async () => {
    await expect(
      placeOrder(
        userId,
        cod([
          { productId: ids.lamp!, quantity: 1 },
          { productId: ids.radio!, quantity: 1 }, // out of stock
        ]),
      ),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    const lamp = await prisma.product.findUniqueOrThrow({ where: { id: ids.lamp! } });
    expect(lamp.stockQuantity).toBe(26);
    expect(await prisma.order.count()).toBe(0);
    expect(await prisma.inventoryAdjustment.count()).toBe(0);
  });
});

describe("placeOrder — historical correctness", () => {
  it("later product edits never touch the order's snapshots", async () => {
    const placed = await placeOrder(userId, cod([{ productId: ids.lamp!, quantity: 2 }]));

    await prisma.product.update({
      where: { id: ids.lamp! },
      data: { name: "Renamed Lamp", priceCents: 9990 },
    });

    const item = await prisma.orderItem.findFirstOrThrow({ where: { orderId: placed.orderId } });
    expect(item.productName).toBe("Halo Desk Lamp");
    expect(item.unitPriceCents).toBe(7990);
    expect(item.lineTotalCents).toBe(15980);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: placed.orderId } });
    expect(order.totalCents).toBe(15980);
  });

  it("stock always equals the starting stock plus the sum of ledger deltas", async () => {
    await placeOrder(userId, cod([{ productId: ids.lamp!, quantity: 3 }]));
    await placeOrder(userId, cod([{ productId: ids.lamp!, quantity: 2 }]));

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { productId: ids.lamp! },
    });
    const deltaSum = adjustments.reduce((sum, a) => sum + a.delta, 0);
    const product = await prisma.product.findUniqueOrThrow({ where: { id: ids.lamp! } });
    expect(product.stockQuantity).toBe(26 + deltaSum);
  });
});

describe("placeOrder — concurrency", () => {
  it("two simultaneous checkouts for the last unit: one succeeds, one gets INSUFFICIENT_STOCK", async () => {
    const attempt = () => placeOrder(userId, cod([{ productId: ids.lastUnit!, quantity: 1 }]));
    const results = await Promise.allSettled([attempt(), attempt()]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: "INSUFFICIENT_STOCK" });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: ids.lastUnit! } });
    expect(product.stockQuantity).toBe(0); // never negative

    expect(await prisma.order.count()).toBe(1);
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { productId: ids.lastUnit! },
    });
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]?.delta).toBe(-1);
  });
});
