import type { OrderStatus } from "@prisma/client";

/**
 * The one order-status machine (plan §13). Admins drive orders forward and may
 * cancel while PLACED or PROCESSING; DELIVERED and CANCELLED are terminal.
 * Customers have exactly one move — cancelling their own PLACED order — which
 * order.service enforces separately.
 */
export const ADMIN_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PLACED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ADMIN_STATUS_TRANSITIONS[from].includes(to);
}
