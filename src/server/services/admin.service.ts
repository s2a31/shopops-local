import { InventoryReason, OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { slugify } from "@/lib/slug";

import type {
  AdminCategoryCreateInput,
  AdminCategoryUpdateInput,
} from "@/features/admin/categories/schemas";
import type { AdminCustomerFilters } from "@/features/admin/customers/schemas";
import type { AdminOrderFilters } from "@/features/admin/orders/schemas";
import type {
  AdminProductCreateInput,
  AdminProductFilters,
  AdminProductUpdateInput,
} from "@/features/admin/products/schemas";
import { canTransition } from "@/features/orders/transitions";

/**
 * Admin dashboard aggregates. Revenue counts every non-cancelled order of the
 * last 30 days (COD orders count when placed — this is demo revenue, not an
 * accounting system). Top products likewise ignore cancelled orders.
 */

const LOW_STOCK_LIMIT = 8;
const TOP_PRODUCTS_LIMIT = 5;

export interface DashboardSummary {
  revenue30dCents: number;
  ordersByStatus: Record<OrderStatus, number>;
  lowStock: {
    id: string;
    name: string;
    slug: string;
    stockQuantity: number;
    lowStockThreshold: number;
  }[];
  topProducts: { productId: string; name: string; unitsSold: number; revenueCents: number }[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [revenue, statusGroups, lowStock, topGroups] = await Promise.all([
    prisma.order.aggregate({
      _sum: { totalCents: true },
      where: { createdAt: { gte: since }, status: { not: OrderStatus.CANCELLED } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.product.findMany({
      where: {
        isActive: true,
        stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
      },
      orderBy: { stockQuantity: "asc" },
      take: LOW_STOCK_LIMIT,
      select: {
        id: true,
        name: true,
        slug: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, lineTotalCents: true },
      where: { order: { status: { not: OrderStatus.CANCELLED } } },
      orderBy: { _sum: { quantity: "desc" } },
      take: TOP_PRODUCTS_LIMIT,
    }),
  ]);

  const ordersByStatus = Object.fromEntries(
    Object.values(OrderStatus).map((status) => [status, 0]),
  ) as Record<OrderStatus, number>;
  for (const group of statusGroups) {
    ordersByStatus[group.status] = group._count._all;
  }

  const topProductNames = await prisma.product.findMany({
    where: { id: { in: topGroups.map((g) => g.productId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(topProductNames.map((p) => [p.id, p.name]));

  return {
    revenue30dCents: revenue._sum.totalCents ?? 0,
    ordersByStatus,
    lowStock,
    topProducts: topGroups.map((group) => ({
      productId: group.productId,
      name: nameById.get(group.productId) ?? "(deleted product)",
      unitsSold: group._sum.quantity ?? 0,
      revenueCents: group._sum.lineTotalCents ?? 0,
    })),
  };
}

/* ------------------------------- products ------------------------------- */

export const ADMIN_PRODUCTS_PAGE_SIZE = 12;

const ADMIN_PRODUCT_LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  priceCents: true,
  stockQuantity: true,
  lowStockThreshold: true,
  isActive: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: { orderBy: { sortOrder: "asc" as const }, take: 1, select: { url: true, altText: true } },
} satisfies Prisma.ProductSelect;

export type AdminProductListItem = Prisma.ProductGetPayload<{
  select: typeof ADMIN_PRODUCT_LIST_SELECT;
}>;

export interface AdminProductListResult {
  items: AdminProductListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Admin product table: includes inactive products, unlike the storefront. */
export async function listAdminProducts(
  filters: AdminProductFilters,
): Promise<AdminProductListResult> {
  const where: Prisma.ProductWhereInput = {
    ...(filters.status === "active" && { isActive: true }),
    ...(filters.status === "inactive" && { isActive: false }),
    ...(filters.category && { category: { slug: filters.category } }),
    ...(filters.lowStock && {
      stockQuantity: { lte: prisma.product.fields.lowStockThreshold },
    }),
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { slug: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
  };

  const total = await prisma.product.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PRODUCTS_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items = await prisma.product.findMany({
    where,
    select: ADMIN_PRODUCT_LIST_SELECT,
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    skip: (page - 1) * ADMIN_PRODUCTS_PAGE_SIZE,
    take: ADMIN_PRODUCTS_PAGE_SIZE,
  });

  return { items, total, page, pageSize: ADMIN_PRODUCTS_PAGE_SIZE, totalPages };
}

const ADMIN_PRODUCT_DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  priceCents: true,
  stockQuantity: true,
  lowStockThreshold: true,
  isActive: true,
  categoryId: true,
  createdAt: true,
  updatedAt: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, url: true, altText: true, sortOrder: true },
  },
} satisfies Prisma.ProductSelect;

export type AdminProductDetail = Prisma.ProductGetPayload<{
  select: typeof ADMIN_PRODUCT_DETAIL_SELECT;
}>;

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  return prisma.product.findUnique({ where: { id }, select: ADMIN_PRODUCT_DETAIL_SELECT });
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function resolveSlug(name: string, explicit: string | undefined): string {
  const slug = explicit ?? slugify(name);
  if (!slug) {
    throw new AppError("VALIDATION_ERROR", "A URL slug could not be derived from this name.");
  }
  return slug;
}

/**
 * Creates a product with its gallery images; a nonzero initial stock is
 * recorded as an INITIAL_STOCK ledger entry attributed to the acting admin,
 * so the sum-of-deltas invariant holds from the first unit.
 */
export async function createProduct(
  input: AdminProductCreateInput,
  actorUserId: string,
): Promise<AdminProductDetail> {
  const slug = resolveSlug(input.name, input.slug);
  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          name: input.name,
          slug,
          description: input.description,
          priceCents: input.priceCents,
          categoryId: input.categoryId,
          isActive: input.isActive,
          lowStockThreshold: input.lowStockThreshold,
          stockQuantity: input.initialStock,
          images: {
            create: input.images.map((image, index) => ({ ...image, sortOrder: index })),
          },
        },
        select: { id: true },
      });
      if (input.initialStock > 0) {
        await tx.inventoryAdjustment.create({
          data: {
            productId: product.id,
            delta: input.initialStock,
            reason: InventoryReason.INITIAL_STOCK,
            actorUserId,
          },
        });
      }
      return (await tx.product.findUniqueOrThrow({
        where: { id: product.id },
        select: ADMIN_PRODUCT_DETAIL_SELECT,
      })) as AdminProductDetail;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", `A product with the slug "${slug}" already exists.`);
    }
    throw error;
  }
}

/**
 * Partial update. Stock is untouchable here (audited adjustments only), and
 * name/price edits never affect past orders thanks to order-item snapshots.
 */
export async function updateProduct(
  id: string,
  input: AdminProductUpdateInput,
): Promise<AdminProductDetail> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Product not found.");
  }

  // Renames keep the existing slug (stable URLs); the slug changes only when
  // the admin sets one explicitly.
  const { images, slug, ...fields } = input;

  try {
    return await prisma.$transaction(async (tx) => {
      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        await tx.productImage.createMany({
          data: images.map((image, index) => ({ ...image, productId: id, sortOrder: index })),
        });
      }
      return (await tx.product.update({
        where: { id },
        data: { ...fields, ...(slug !== undefined && { slug }) },
        select: ADMIN_PRODUCT_DETAIL_SELECT,
      })) as AdminProductDetail;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", "A product with this slug already exists.");
    }
    throw error;
  }
}

/* ------------------------------ categories ------------------------------ */

const ADMIN_CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  sortOrder: true,
  _count: { select: { products: true } },
} satisfies Prisma.CategorySelect;

export type AdminCategory = Prisma.CategoryGetPayload<{ select: typeof ADMIN_CATEGORY_SELECT }>;

export async function listAdminCategories(): Promise<AdminCategory[]> {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: ADMIN_CATEGORY_SELECT,
  });
}

export async function createCategory(input: AdminCategoryCreateInput): Promise<AdminCategory> {
  const slug = resolveSlug(input.name, input.slug);
  try {
    return await prisma.category.create({
      data: {
        name: input.name,
        slug,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      },
      select: ADMIN_CATEGORY_SELECT,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", "A category with this name or slug already exists.");
    }
    throw error;
  }
}

export async function updateCategory(
  id: string,
  input: AdminCategoryUpdateInput,
): Promise<AdminCategory> {
  const existing = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Category not found.");
  }
  try {
    return await prisma.category.update({
      where: { id },
      data: input,
      select: ADMIN_CATEGORY_SELECT,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", "A category with this name or slug already exists.");
    }
    throw error;
  }
}

/* --------------------------------- orders -------------------------------- */

export const ADMIN_ORDERS_PAGE_SIZE = 12;

const ADMIN_ORDER_LIST_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  totalCents: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
  _count: { select: { items: true } },
} satisfies Prisma.OrderSelect;

export type AdminOrderListItem = Prisma.OrderGetPayload<{
  select: typeof ADMIN_ORDER_LIST_SELECT;
}>;

export interface AdminOrderListResult {
  items: AdminOrderListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Admin order table: every order, filterable by status and order number / email. */
export async function listAdminOrders(filters: AdminOrderFilters): Promise<AdminOrderListResult> {
  const where: Prisma.OrderWhereInput = {
    ...(filters.status && { status: filters.status }),
    ...(filters.q && {
      OR: [
        { orderNumber: { contains: filters.q, mode: "insensitive" } },
        { user: { email: { contains: filters.q, mode: "insensitive" } } },
      ],
    }),
  };

  const total = await prisma.order.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_ORDERS_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const items = await prisma.order.findMany({
    where,
    select: ADMIN_ORDER_LIST_SELECT,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ADMIN_ORDERS_PAGE_SIZE,
    take: ADMIN_ORDERS_PAGE_SIZE,
  });

  return { items, total, page, pageSize: ADMIN_ORDERS_PAGE_SIZE, totalPages };
}

const ADMIN_ORDER_DETAIL_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  paymentRef: true,
  subtotalCents: true,
  shippingCents: true,
  totalCents: true,
  shippingName: true,
  shippingPhone: true,
  shippingStreet: true,
  shippingCity: true,
  shippingPostalCode: true,
  shippingCountry: true,
  cancelledAt: true,
  createdAt: true,
  user: { select: { id: true, name: true, email: true } },
  items: {
    orderBy: { productName: "asc" as const },
    select: {
      id: true,
      productId: true,
      productName: true,
      unitPriceCents: true,
      quantity: true,
      lineTotalCents: true,
      product: { select: { slug: true, isActive: true } },
    },
  },
} satisfies Prisma.OrderSelect;

export type AdminOrderDetail = Prisma.OrderGetPayload<{
  select: typeof ADMIN_ORDER_DETAIL_SELECT;
}>;

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  return prisma.order.findUnique({ where: { id }, select: ADMIN_ORDER_DETAIL_SELECT });
}

/**
 * Applies one admin status transition, validated against the machine in
 * features/orders/transitions. The status flip is a conditional update, so a
 * concurrent transition loses cleanly (409). Cancelling restores stock with
 * ORDER_CANCELLED ledger rows and refunds a paid card; delivering a COD order
 * marks its payment PAID.
 */
export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<AdminOrderDetail> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        items: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.");
    }
    if (!canTransition(order.status, nextStatus)) {
      throw new AppError("CONFLICT", `An order cannot move from ${order.status} to ${nextStatus}.`);
    }

    const becomesPaid =
      nextStatus === OrderStatus.DELIVERED &&
      order.paymentMethod === PaymentMethod.CASH_ON_DELIVERY &&
      order.paymentStatus === PaymentStatus.PENDING;
    const becomesRefunded =
      nextStatus === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.PAID;

    const updated = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: {
        status: nextStatus,
        ...(nextStatus === OrderStatus.CANCELLED && { cancelledAt: new Date() }),
        ...(becomesPaid && { paymentStatus: PaymentStatus.PAID }),
        ...(becomesRefunded && { paymentStatus: PaymentStatus.REFUNDED }),
      },
    });
    if (updated.count === 0) {
      throw new AppError("CONFLICT", "The order changed underneath you — reload and retry.");
    }

    if (nextStatus === OrderStatus.CANCELLED) {
      // Same deterministic productId ordering as checkout and customer
      // cancellation — consistent lock order prevents deadlocks.
      const lines = [...order.items].sort((a, b) => (a.productId < b.productId ? -1 : 1));
      for (const line of lines) {
        await tx.product.update({
          where: { id: line.productId },
          data: { stockQuantity: { increment: line.quantity } },
        });
      }
      await tx.inventoryAdjustment.createMany({
        data: lines.map((line) => ({
          productId: line.productId,
          delta: line.quantity,
          reason: InventoryReason.ORDER_CANCELLED,
          orderId: order.id,
        })),
      });
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      select: ADMIN_ORDER_DETAIL_SELECT,
    });
  });
}

/* ------------------------------- customers ------------------------------- */

export const ADMIN_CUSTOMERS_PAGE_SIZE = 12;

export interface AdminCustomerListItem {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  orderCount: number;
  /** Lifetime spend over non-cancelled orders. */
  totalSpentCents: number;
}

export interface AdminCustomerListResult {
  items: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Customer directory — non-sensitive fields only; password hashes never leave the DB. */
export async function listAdminCustomers(
  filters: AdminCustomerFilters,
): Promise<AdminCustomerListResult> {
  const where: Prisma.UserWhereInput = {
    role: "CUSTOMER",
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { email: { contains: filters.q, mode: "insensitive" } },
      ],
    }),
  };

  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_CUSTOMERS_PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);

  const users = await prisma.user.findMany({
    where,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * ADMIN_CUSTOMERS_PAGE_SIZE,
    take: ADMIN_CUSTOMERS_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      orders: { select: { totalCents: true, status: true } },
    },
  });

  return {
    items: users.map(({ orders, ...user }) => ({
      ...user,
      orderCount: orders.length,
      totalSpentCents: orders
        .filter((order) => order.status !== OrderStatus.CANCELLED)
        .reduce((sum, order) => sum + order.totalCents, 0),
    })),
    total,
    page,
    pageSize: ADMIN_CUSTOMERS_PAGE_SIZE,
    totalPages,
  };
}
