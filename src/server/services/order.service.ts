import { InventoryReason, OrderStatus, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { AppError } from "@/lib/errors";

/**
 * Customer-facing order access. Ownership is part of every query — another
 * user's order id behaves exactly like a nonexistent one (404, no existence
 * leak).
 */

export const ORDERS_PAGE_SIZE = 10;

const ORDER_DETAIL_SELECT = {
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
} as const;

export async function getOrderForUser(userId: string, orderId: string) {
  return prisma.order.findFirst({
    where: { id: orderId, userId },
    select: ORDER_DETAIL_SELECT,
  });
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderForUser>>>;

/** Paginated history, newest first; page overflow clamps to the last page. */
export async function listOrdersForUser(userId: string, page: number) {
  const total = await prisma.order.count({ where: { userId } });
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * ORDERS_PAGE_SIZE,
    take: ORDERS_PAGE_SIZE,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      totalCents: true,
      createdAt: true,
      items: { select: { quantity: true } },
    },
  });

  return {
    items: orders.map(({ items, ...order }) => ({
      ...order,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    total,
    page: safePage,
    pageSize: ORDERS_PAGE_SIZE,
    totalPages,
  };
}

export type OrderListPage = Awaited<ReturnType<typeof listOrdersForUser>>;

/**
 * Customer cancellation: own orders, PLACED only. One transaction flips the
 * status, restores stock (with ORDER_CANCELLED ledger rows), and flags a paid
 * simulated-card payment as REFUNDED. The status flip is a conditional
 * update, so a concurrent cancel or admin transition can never restore stock
 * twice.
 */
export async function cancelOrderForUser(userId: string, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        items: { select: { productId: true, quantity: true } },
      },
    });
    if (!order) {
      throw new AppError("NOT_FOUND", "Order not found.");
    }
    if (order.status !== OrderStatus.PLACED) {
      throw new AppError("CONFLICT", "This order can no longer be cancelled.");
    }

    const updated = await tx.order.updateMany({
      where: { id: order.id, status: OrderStatus.PLACED },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        ...(order.paymentStatus === PaymentStatus.PAID
          ? { paymentStatus: PaymentStatus.REFUNDED }
          : {}),
      },
    });
    if (updated.count === 0) {
      throw new AppError("CONFLICT", "This order can no longer be cancelled.");
    }

    // Restore stock in deterministic productId order — the same lock-ordering
    // discipline checkout uses, so cancellations can't deadlock against it.
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

    return tx.order.findFirstOrThrow({
      where: { id: order.id },
      select: ORDER_DETAIL_SELECT,
    });
  });
}

export interface ShippingAddressSnapshot {
  name: string;
  phone: string | null;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

/**
 * The most recent order's shipping snapshot, used to prefill the checkout
 * form. v1 has no address book — this is the documented substitute.
 */
export async function getLatestShippingAddressForUser(
  userId: string,
): Promise<ShippingAddressSnapshot | null> {
  const order = await prisma.order.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      shippingName: true,
      shippingPhone: true,
      shippingStreet: true,
      shippingCity: true,
      shippingPostalCode: true,
      shippingCountry: true,
    },
  });
  if (!order) return null;
  return {
    name: order.shippingName,
    phone: order.shippingPhone,
    street: order.shippingStreet,
    city: order.shippingCity,
    postalCode: order.shippingPostalCode,
    country: order.shippingCountry,
  };
}
