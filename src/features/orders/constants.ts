import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PLACED: "Placed",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/** Color reinforces the label but never replaces it (status text always shows). */
export const ORDER_STATUS_BADGE_VARIANTS: Record<
  OrderStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PLACED: "default",
  PROCESSING: "secondary",
  SHIPPED: "secondary",
  DELIVERED: "outline",
  CANCELLED: "destructive",
};
