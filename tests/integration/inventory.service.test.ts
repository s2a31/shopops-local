import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { createAdjustment, listAdjustments } from "@/server/services/inventory.service";

import { resetDb } from "../helpers/db";

let adminId: string;
let productId: string;

beforeEach(async () => {
  await resetDb();
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      passwordHash: "irrelevant-here",
      name: "Admin",
      role: "ADMIN",
    },
  });
  adminId = admin.id;

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
  await prisma.inventoryAdjustment.create({
    data: { productId, delta: 10, reason: "INITIAL_STOCK", actorUserId: adminId },
  });
});

describe("createAdjustment", () => {
  it("applies the delta and records an attributed ledger row atomically", async () => {
    const result = await createAdjustment(
      { productId, delta: -4, reason: "MANUAL_CORRECTION", note: "damaged" },
      adminId,
    );
    expect(result.stockQuantity).toBe(6);
    expect(result.adjustment).toMatchObject({
      delta: -4,
      reason: "MANUAL_CORRECTION",
      note: "damaged",
      actor: { name: "Admin" },
    });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stockQuantity).toBe(6);
  });

  it("refuses to take stock below zero and leaves no trace", async () => {
    await expect(
      createAdjustment({ productId, delta: -11, reason: "MANUAL_CORRECTION" }, adminId),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    expect(product.stockQuantity).toBe(10);
    expect(await prisma.inventoryAdjustment.count({ where: { productId } })).toBe(1);
  });

  it("throws NOT_FOUND for a missing product", async () => {
    await expect(
      createAdjustment({ productId: "missing", delta: 5, reason: "RESTOCK" }, adminId),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps stockQuantity equal to the sum of all deltas", async () => {
    await createAdjustment({ productId, delta: 15, reason: "RESTOCK" }, adminId);
    await createAdjustment({ productId, delta: -6, reason: "MANUAL_CORRECTION" }, adminId);
    await createAdjustment({ productId, delta: 2, reason: "RESTOCK" }, adminId);

    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    const sum = await prisma.inventoryAdjustment.aggregate({
      where: { productId },
      _sum: { delta: true },
    });
    expect(product.stockQuantity).toBe(21);
    expect(sum._sum.delta).toBe(21);
  });
});

describe("listAdjustments", () => {
  it("returns newest first and filters by product", async () => {
    const category = await prisma.category.findFirstOrThrow();
    const other = await prisma.product.create({
      data: {
        name: "Compass Mug",
        slug: "compass-mug",
        description: "Mug",
        priceCents: 2690,
        stockQuantity: 5,
        categoryId: category.id,
      },
    });
    await createAdjustment({ productId, delta: 3, reason: "RESTOCK" }, adminId);
    await createAdjustment({ productId: other.id, delta: 1, reason: "RESTOCK" }, adminId);

    const all = await listAdjustments({ productId: undefined, page: 1 });
    expect(all.total).toBe(3);
    expect(all.items[0]?.product.name).toBe("Compass Mug");

    const scoped = await listAdjustments({ productId: other.id, page: 1 });
    expect(scoped.total).toBe(1);
    expect(scoped.items[0]?.delta).toBe(1);
  });

  it("clamps the page to the last available one", async () => {
    const result = await listAdjustments({ productId: undefined, page: 999 });
    expect(result.page).toBe(1);
    expect(result.items).toHaveLength(1);
  });
});
