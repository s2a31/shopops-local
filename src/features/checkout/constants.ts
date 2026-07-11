import type { PaymentMethod, PaymentStatus } from "@prisma/client";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  SIMULATED_CARD: "Simulated card",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Payment pending",
  PAID: "Paid",
  REFUNDED: "Refunded",
};
