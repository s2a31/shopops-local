import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import {
  listAdminCustomers,
  listAdminOrders,
  updateOrderStatus,
} from "@/server/services/admin.service";

import { resetDb } from "../helpers/db";

let customerId: string;
let productId: string;

async function createOrder(options: {
  status?: "PLACED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  paymentMethod?: "CASH_ON_DELIVERY" | "SIMULATED_CARD";
  paymentStatus?: "PENDING" | "PAID" | "REFUNDED";
  totalCents?: number;
  quantity?: number;
  orderNumber?: string;
  userId?: string;
}) {
  const total = options.totalCents ?? 7990;
  return prisma.order.create({
    data: {
      orderNumber:
        options.orderNumber ?? `SO-${String(Math.floor(Math.random() * 900000) + 100000)}`,
      userId: options.userId ?? customerId,
      status: options.status ?? "PLACED",
      paymentMethod: options.paymentMethod ?? "CASH_ON_DELIVERY",
      paymentStatus: options.paymentStatus ?? "PENDING",
      subtotalCents: total,
      shippingCents: 0,
      totalCents: total,
      shippingName: "Buyer",
      shippingStreet: "Street 1",
      shippingCity: "City",
      shippingPostalCode: "1234",
      shippingCountry: "Country",
      items: {
        create: {
          productId,
          productName: "snapshot",
          unitPriceCents: total,
          quantity: options.quantity ?? 1,
          lineTotalCents: total,
        },
      },
    },
  });
}

beforeEach(async () => {
  await resetDb();
  const customer = await prisma.user.create({
    data: { email: "buyer@example.com", passwordHash: "irrelevant-here", name: "Buyer" },
  });
  customerId = customer.id;

  const category = await prisma.category.create({ data: { name: "Home", slug: "home" } });
  const product = await prisma.product.create({
    data: {
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      description: "Lamp",
      priceCents: 7990,
      stockQuantity: 10,
      categoryId: category.id,
    },
  });
  productId = product.id;
});

describe("updateOrderStatus", () => {
  it("walks the forward chain and marks a delivered COD order paid", async () => {
    const order = await createOrder({});

    let updated = await updateOrderStatus(order.id, "PROCESSING");
    expect(updated.status).toBe("PROCESSING");

    updated = await updateOrderStatus(order.id, "SHIPPED");
    expect(updated.status).toBe("SHIPPED");

    updated = await updateOrderStatus(order.id, "DELIVERED");
    expect(updated.status).toBe("DELIVERED");
    expect(updated.paymentStatus).toBe("PAID");
  });

  it("rejects transitions the machine does not allow", async () => {
    const order = await createOrder({});
    await expect(updateOrderStatus(order.id, "DELIVERED")).rejects.toMatchObject({
      code: "CONFLICT",
    });

    const delivered = await createOrder({ status: "DELIVERED", paymentStatus: "PAID" });
    await expect(updateOrderStatus(delivered.id, "CANCELLED")).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("throws NOT_FOUND for a missing order", async () => {
    await expect(updateOrderStatus("missing", "PROCESSING")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("admin cancellation restores stock, writes ledger rows and refunds a paid card", async () => {
    const order = await createOrder({
      status: "PROCESSING",
      paymentMethod: "SIMULATED_CARD",
      paymentStatus: "PAID",
      quantity: 3,
    });

    const updated = await updateOrderStatus(order.id, "CANCELLED");
    expect(updated.status).toBe("CANCELLED");
    expect(updated.paymentStatus).toBe("REFUNDED");
    expect(updated.cancelledAt).not.toBeNull();

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stockQuantity).toBe(13);

    const ledger = await prisma.inventoryAdjustment.findMany({ where: { orderId: order.id } });
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ delta: 3, reason: "ORDER_CANCELLED", actorUserId: null });
  });
});

describe("listAdminOrders", () => {
  it("filters by status and matches order number or customer email", async () => {
    await createOrder({ orderNumber: "SO-100001" });
    await createOrder({ orderNumber: "SO-100002", status: "DELIVERED", paymentStatus: "PAID" });

    const placed = await listAdminOrders({ status: "PLACED", q: undefined, page: 1 });
    expect(placed.total).toBe(1);
    expect(placed.items[0]?.orderNumber).toBe("SO-100001");

    const byNumber = await listAdminOrders({ status: undefined, q: "so-100002", page: 1 });
    expect(byNumber.total).toBe(1);

    const byEmail = await listAdminOrders({ status: undefined, q: "BUYER@example", page: 1 });
    expect(byEmail.total).toBe(2);
    expect(byEmail.items[0]?.user.email).toBe("buyer@example.com");
  });
});

describe("listAdminCustomers", () => {
  it("aggregates orders and spend, excluding cancelled orders and admin accounts", async () => {
    await prisma.user.create({
      data: {
        email: "admin@example.com",
        passwordHash: "irrelevant-here",
        name: "Admin",
        role: "ADMIN",
      },
    });
    await createOrder({ totalCents: 1000 });
    await createOrder({ totalCents: 2000, status: "DELIVERED", paymentStatus: "PAID" });
    await createOrder({ totalCents: 50_000, status: "CANCELLED" });

    const result = await listAdminCustomers({ q: undefined, page: 1 });
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      email: "buyer@example.com",
      orderCount: 3,
      totalSpentCents: 3000,
    });
    expect(result.items[0]).not.toHaveProperty("passwordHash");

    const missed = await listAdminCustomers({ q: "nobody", page: 1 });
    expect(missed.total).toBe(0);
  });

  it("lists a customer with zero orders with zeroed aggregates", async () => {
    await prisma.user.create({
      data: {
        email: "window-shopper@example.com",
        passwordHash: "irrelevant-here",
        name: "Shopper",
      },
    });

    const result = await listAdminCustomers({ q: undefined, page: 1 });
    expect(result.total).toBe(2);
    const shopper = result.items.find((item) => item.email === "window-shopper@example.com");
    expect(shopper).toMatchObject({ orderCount: 0, totalSpentCents: 0 });
  });
});
