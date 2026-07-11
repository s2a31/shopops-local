import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { getDashboardSummary } from "@/server/services/admin.service";

import { resetDb } from "../helpers/db";

const DAY_MS = 24 * 60 * 60 * 1000;

let userId: string;
let lampId: string;
let mugId: string;

async function createOrder(options: {
  productId: string;
  quantity: number;
  totalCents: number;
  status?: "PLACED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  createdAt?: Date;
}) {
  const order = await prisma.order.create({
    data: {
      orderNumber: `SO-${String(Math.floor(Math.random() * 900000) + 100000)}`,
      userId,
      status: options.status ?? "PLACED",
      paymentMethod: "CASH_ON_DELIVERY",
      subtotalCents: options.totalCents,
      shippingCents: 0,
      totalCents: options.totalCents,
      shippingName: "Buyer",
      shippingStreet: "Street 1",
      shippingCity: "City",
      shippingPostalCode: "1234",
      shippingCountry: "Country",
      createdAt: options.createdAt ?? new Date(),
      items: {
        create: {
          productId: options.productId,
          productName: "snapshot",
          unitPriceCents: Math.round(options.totalCents / options.quantity),
          quantity: options.quantity,
          lineTotalCents: options.totalCents,
        },
      },
    },
  });
  return order;
}

beforeEach(async () => {
  await resetDb();
  const user = await prisma.user.create({
    data: { email: "buyer@example.com", passwordHash: "irrelevant-here", name: "Buyer" },
  });
  userId = user.id;

  const category = await prisma.category.create({ data: { name: "Home", slug: "home" } });
  const lamp = await prisma.product.create({
    data: {
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      description: "Lamp",
      priceCents: 7990,
      stockQuantity: 3,
      lowStockThreshold: 5,
      categoryId: category.id,
    },
  });
  const mug = await prisma.product.create({
    data: {
      name: "Compass Mug",
      slug: "compass-mug",
      description: "Mug",
      priceCents: 2690,
      stockQuantity: 50,
      lowStockThreshold: 5,
      categoryId: category.id,
    },
  });
  lampId = lamp.id;
  mugId = mug.id;
});

describe("getDashboardSummary", () => {
  it("sums 30-day revenue, skipping cancelled and older orders", async () => {
    await createOrder({ productId: lampId, quantity: 1, totalCents: 1000 });
    await createOrder({ productId: lampId, quantity: 1, totalCents: 2000, status: "DELIVERED" });
    await createOrder({ productId: lampId, quantity: 1, totalCents: 4000, status: "CANCELLED" });
    await createOrder({
      productId: lampId,
      quantity: 1,
      totalCents: 8000,
      createdAt: new Date(Date.now() - 45 * DAY_MS),
    });

    const summary = await getDashboardSummary();
    expect(summary.revenue30dCents).toBe(3000);
  });

  it("counts orders per status across all time", async () => {
    await createOrder({ productId: lampId, quantity: 1, totalCents: 1000 });
    await createOrder({ productId: lampId, quantity: 1, totalCents: 1000, status: "CANCELLED" });
    await createOrder({
      productId: lampId,
      quantity: 1,
      totalCents: 1000,
      status: "DELIVERED",
      createdAt: new Date(Date.now() - 90 * DAY_MS),
    });

    const summary = await getDashboardSummary();
    expect(summary.ordersByStatus).toMatchObject({
      PLACED: 1,
      CANCELLED: 1,
      DELIVERED: 1,
      PROCESSING: 0,
      SHIPPED: 0,
    });
  });

  it("lists active products at or below their low-stock threshold, lowest first", async () => {
    await prisma.product.create({
      data: {
        name: "Hidden Gone Item",
        slug: "hidden-gone-item",
        description: "Inactive",
        priceCents: 999,
        stockQuantity: 0,
        isActive: false,
        categoryId: (await prisma.category.findFirstOrThrow()).id,
      },
    });

    const summary = await getDashboardSummary();
    expect(summary.lowStock.map((p) => p.name)).toEqual(["Halo Desk Lamp"]);
    expect(summary.lowStock[0]).toMatchObject({ stockQuantity: 3, lowStockThreshold: 5 });
  });

  it("ranks top products by units sold, ignoring cancelled orders", async () => {
    await createOrder({ productId: lampId, quantity: 2, totalCents: 15980 });
    await createOrder({ productId: mugId, quantity: 5, totalCents: 13450 });
    await createOrder({ productId: mugId, quantity: 9, totalCents: 24210, status: "CANCELLED" });

    const summary = await getDashboardSummary();
    expect(summary.topProducts.map((p) => ({ name: p.name, unitsSold: p.unitsSold }))).toEqual([
      { name: "Compass Mug", unitsSold: 5 },
      { name: "Halo Desk Lamp", unitsSold: 2 },
    ]);
  });
});
