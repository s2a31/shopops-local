import { prisma } from "@/lib/db";

/**
 * Customer-facing order access. Ownership is part of every query — another
 * user's order id behaves exactly like a nonexistent one (404, no existence
 * leak). Extended with listing and cancellation in M8.
 */

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
