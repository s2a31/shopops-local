import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";

import { parseProductFilters } from "@/features/catalog/schemas";
import {
  getProductBySlug,
  listCategories,
  listFeaturedProducts,
  listProducts,
} from "@/server/services/catalog.service";

import { resetDb } from "../helpers/db";

const filters = (params: Record<string, string> = {}) => parseProductFilters(params);

async function seedCatalog() {
  const lighting = await prisma.category.create({
    data: { name: "Lighting", slug: "lighting", sortOrder: 1 },
  });
  const audio = await prisma.category.create({
    data: { name: "Audio", slug: "audio", sortOrder: 2 },
  });

  const make = (
    name: string,
    slug: string,
    priceCents: number,
    categoryId: string,
    extra: Partial<{ isActive: boolean; stockQuantity: number; description: string }> = {},
  ) =>
    prisma.product.create({
      data: {
        name,
        slug,
        description: extra.description ?? `${name} description`,
        priceCents,
        stockQuantity: extra.stockQuantity ?? 10,
        isActive: extra.isActive ?? true,
        categoryId,
      },
    });

  await make("Halo Desk Lamp", "halo-desk-lamp", 7990, lighting.id, {
    description: "A ring-headed lamp with dimming.",
  });
  await make("Lumen Floor Lamp", "lumen-floor-lamp", 18900, lighting.id);
  await make("Hidden Lamp", "hidden-lamp", 999, lighting.id, { isActive: false });
  await make("Reverb Mini Speaker", "reverb-mini-speaker", 8990, audio.id);
  await make("Sold Out Radio", "sold-out-radio", 6490, audio.id, { stockQuantity: 0 });
}

beforeEach(async () => {
  await resetDb();
  await seedCatalog();
});

describe("listProducts", () => {
  it("returns only active products by default", async () => {
    const result = await listProducts(filters());
    expect(result.total).toBe(4);
    expect(result.items.map((p) => p.slug)).not.toContain("hidden-lamp");
  });

  it("searches name and description case-insensitively", async () => {
    const byName = await listProducts(filters({ q: "LUMEN" }));
    expect(byName.items.map((p) => p.slug)).toEqual(["lumen-floor-lamp"]);

    const byDescription = await listProducts(filters({ q: "ring-headed" }));
    expect(byDescription.items.map((p) => p.slug)).toEqual(["halo-desk-lamp"]);
  });

  it("filters by category slug", async () => {
    const result = await listProducts(filters({ category: "audio" }));
    expect(result.items.map((p) => p.slug).sort()).toEqual([
      "reverb-mini-speaker",
      "sold-out-radio",
    ]);
  });

  it("filters by min and max price in whole euros", async () => {
    const result = await listProducts(filters({ minPrice: "70", maxPrice: "100" }));
    expect(result.items.map((p) => p.slug).sort()).toEqual([
      "halo-desk-lamp",
      "reverb-mini-speaker",
    ]);
  });

  it("sorts by price in both directions", async () => {
    const asc = await listProducts(filters({ sort: "price-asc" }));
    const prices = asc.items.map((p) => p.priceCents);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));

    const desc = await listProducts(filters({ sort: "price-desc" }));
    expect(desc.items[0]!.slug).toBe("lumen-floor-lamp");
  });

  it("paginates with a stable order and clamps overflowing pages", async () => {
    const page1 = await listProducts(filters({ sort: "name" }));
    expect(page1.totalPages).toBe(1);

    // Requesting a page beyond the end clamps to the last page instead of
    // returning an empty list.
    const clamped = await listProducts(filters({ sort: "name", page: "99" }));
    expect(clamped.page).toBe(1);
    expect(clamped.items.length).toBeGreaterThan(0);
  });
});

describe("getProductBySlug", () => {
  it("returns an active product with its category", async () => {
    const product = await getProductBySlug("halo-desk-lamp");
    expect(product?.category.slug).toBe("lighting");
  });

  it("returns null for inactive and unknown products", async () => {
    await expect(getProductBySlug("hidden-lamp")).resolves.toBeNull();
    await expect(getProductBySlug("does-not-exist")).resolves.toBeNull();
  });
});

describe("listCategories", () => {
  it("counts only active products", async () => {
    const categories = await listCategories();
    const lighting = categories.find((c) => c.slug === "lighting");
    expect(lighting?._count.products).toBe(2);
  });
});

describe("listFeaturedProducts", () => {
  it("excludes inactive and out-of-stock products", async () => {
    const featured = await listFeaturedProducts(10);
    const slugs = featured.map((p) => p.slug);
    expect(slugs).not.toContain("hidden-lamp");
    expect(slugs).not.toContain("sold-out-radio");
  });
});
