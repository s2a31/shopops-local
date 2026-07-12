import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";
import { formatDate } from "@/lib/dates";

import { Badge } from "@/components/ui/badge";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/features/checkout/constants";
import { CancelOrderButton } from "@/features/orders/components/cancel-order-button";
import { OrderContents } from "@/features/orders/components/order-contents";
import { ORDER_STATUS_BADGE_VARIANTS, ORDER_STATUS_LABELS } from "@/features/orders/constants";
import { getOrderForUser } from "@/server/services/order.service";

export const metadata: Metadata = { title: "Order details" };

/** Owner-only: another user's order id 404s, so order ids leak nothing. */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  // The layout redirects guests too, but layouts and pages render in
  // parallel — the page must handle null itself, never assert it away.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  const { orderId } = await params;
  const order = await getOrderForUser(user.id, orderId);
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <Link
        href="/account/orders"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Order history
      </Link>

      <div className="mt-4 rounded-xl border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
          <Badge variant={ORDER_STATUS_BADGE_VARIANTS[order.status]}>
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Placed {formatDate(order.createdAt)} · {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          {order.paymentRef ? ` (reference ${order.paymentRef})` : ""}
        </p>
        {order.status === "CANCELLED" && order.cancelledAt && (
          <p className="mt-2 text-sm text-muted-foreground">
            Cancelled {formatDate(order.cancelledAt)} — the items went back into stock
            {order.paymentStatus === "REFUNDED"
              ? " and the simulated payment was flagged as refunded"
              : ""}
            .
          </p>
        )}

        <OrderContents order={order} />

        {order.status === "PLACED" && (
          <div className="mt-8 border-t pt-6">
            <CancelOrderButton orderId={order.id} orderNumber={order.orderNumber} />
            <p className="mt-2 text-xs text-muted-foreground">
              Orders can be cancelled while they are still in the Placed state.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
