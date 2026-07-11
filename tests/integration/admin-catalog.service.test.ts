import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

import { adminCategoryCreateSchema } from "@/features/admin/categories/schemas";

import {
  createCategory,
  createProduct,
  updateCategory,
  updateProduct,
} from "@/server/services/admin.service";

import { resetDb } from "../helpers/db";

/**
 * Slug rules for admin catalogue management. The load-bearing guarantee:
 * renaming an existing product or category never changes its URL slug —
 * a slug changes only when the admin provides one explicitly.
 */

let adminId: string;
let categoryId: string;

const productInput = (overrides: Record<string, unknown> = {}) => ({
  name: "Halo Desk Lamp",
  description: "A lamp.",
  priceCents: 7990,
  categoryId,
  images: [{ url: "/images/products/halo-desk-lamp.svg", altText: "A desk lamp" }],
  isActive: true,
  lowStockThreshold: 5,
  initialStock: 10,
  ...overrides,
});

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
  categoryId = category.id;
});

describe("createProduct", () => {
  it("derives the slug from the name when none is given", async () => {
    const product = await createProduct(productInput({ name: "Café Crème Kit" }), adminId);
    expect(product.slug).toBe("cafe-creme-kit");
  });

  it("uses an explicit slug verbatim", async () => {
    const product = await createProduct(productInput({ slug: "my-own-slug" }), adminId);
    expect(product.slug).toBe("my-own-slug");
  });

  it("rejects a name that cannot be slugified when no slug is given", async () => {
    await expect(createProduct(productInput({ name: "Молоко" }), adminId)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });

  it("rejects a duplicate slug with a conflict", async () => {
    await createProduct(productInput(), adminId);
    await expect(
      createProduct(productInput({ name: "Halo Desk Lamp" }), adminId),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("records a positive initial stock as an INITIAL_STOCK ledger entry", async () => {
    const product = await createProduct(productInput({ initialStock: 12 }), adminId);
    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: { productId: product.id },
    });
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({
      delta: 12,
      reason: "INITIAL_STOCK",
      actorUserId: adminId,
    });
  });

  it("records no ledger entry for zero initial stock", async () => {
    const product = await createProduct(productInput({ initialStock: 0 }), adminId);
    const count = await prisma.inventoryAdjustment.count({ where: { productId: product.id } });
    expect(count).toBe(0);
  });
});

describe("updateProduct", () => {
  it("keeps the existing slug when the product is renamed", async () => {
    const product = await createProduct(productInput(), adminId);
    const updated = await updateProduct(product.id, { name: "Completely New Name" });
    expect(updated.name).toBe("Completely New Name");
    expect(updated.slug).toBe("halo-desk-lamp");
  });

  it("changes the slug only when one is explicitly provided", async () => {
    const product = await createProduct(productInput(), adminId);
    const updated = await updateProduct(product.id, { slug: "renamed-lamp" });
    expect(updated.slug).toBe("renamed-lamp");
  });

  it("rejects an explicit slug that collides with another product", async () => {
    await createProduct(productInput({ name: "First", slug: "first" }), adminId);
    const second = await createProduct(productInput({ name: "Second", slug: "second" }), adminId);
    await expect(updateProduct(second.id, { slug: "first" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("replaces the image set wholesale, reindexing sort order", async () => {
    const product = await createProduct(productInput(), adminId);
    const updated = await updateProduct(product.id, {
      images: [
        { url: "/images/products/compass-mug.svg", altText: "A mug" },
        { url: "/images/products/halo-desk-lamp.svg", altText: "A lamp" },
      ],
    });
    expect(updated.images.map((i) => ({ url: i.url, sortOrder: i.sortOrder }))).toEqual([
      { url: "/images/products/compass-mug.svg", sortOrder: 0 },
      { url: "/images/products/halo-desk-lamp.svg", sortOrder: 1 },
    ]);
  });

  it("throws NOT_FOUND for a missing product", async () => {
    await expect(updateProduct("missing-id", { name: "X" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("category slugs", () => {
  it("derives the slug on create and keeps it on rename", async () => {
    const category = await createCategory(
      adminCategoryCreateSchema.parse({ name: "Büro Zubehör" }),
    );
    expect(category.slug).toBe("buro-zubehor");

    const renamed = await updateCategory(category.id, { name: "Office Supplies" });
    expect(renamed.name).toBe("Office Supplies");
    expect(renamed.slug).toBe("buro-zubehor");
  });

  it("rejects duplicate category names or slugs with a conflict", async () => {
    const duplicate = adminCategoryCreateSchema.parse({ name: "Home" });
    await expect(createCategory(duplicate)).rejects.toBeInstanceOf(AppError);
    await expect(createCategory(duplicate)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
