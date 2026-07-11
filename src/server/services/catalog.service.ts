import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";

import type { ProductFilters } from "@/features/catalog/schemas";

export const PAGE_SIZE = 12;

const LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  priceCents: true,
  stockQuantity: true,
  lowStockThreshold: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    take: 1,
    select: { url: true, altText: true },
  },
} satisfies Prisma.ProductSelect;

export type ProductListItem = Prisma.ProductGetPayload<{ select: typeof LIST_SELECT }>;

export interface ProductListResult {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const SORT_ORDER: Record<ProductFilters["sort"], Prisma.ProductOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }, { id: "asc" }],
  "price-asc": [{ priceCents: "asc" }, { id: "asc" }],
  "price-desc": [{ priceCents: "desc" }, { id: "asc" }],
  name: [{ name: "asc" }, { id: "asc" }],
};

export async function listProducts(filters: ProductFilters): Promise<ProductListResult> {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    ...(filters.category && { category: { slug: filters.category } }),
    ...(filters.minPrice !== undefined && { priceCents: { gte: filters.minPrice * 100 } }),
    ...(filters.maxPrice !== undefined && {
      priceCents: {
        ...(filters.minPrice !== undefined && { gte: filters.minPrice * 100 }),
        lte: filters.maxPrice * 100,
      },
    }),
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items = await prisma.product.findMany({
    where,
    select: LIST_SELECT,
    orderBy: SORT_ORDER[filters.sort],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return { items, total, page, pageSize: PAGE_SIZE, totalPages };
}

export async function getProductBySlug(slug: string) {
  return prisma.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      priceCents: true,
      stockQuantity: true,
      lowStockThreshold: true,
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" }, select: { url: true, altText: true } },
    },
  });
}

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      _count: { select: { products: { where: { isActive: true } } } },
    },
  });
}

/** Newest active products for the home page. */
export async function listFeaturedProducts(take = 4): Promise<ProductListItem[]> {
  return prisma.product.findMany({
    where: { isActive: true, stockQuantity: { gt: 0 } },
    select: LIST_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    take,
  });
}
