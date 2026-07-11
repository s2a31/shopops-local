import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/features/checkout/constants";
import { OrderContents } from "@/features/orders/components/order-contents";
import { getOrderForUser } from "@/server/services/order.service";

export const metadata: Metadata = { title: "Order confirmation" };

/**
 * Owner-only: another user's order id behaves exactly like a nonexistent one
 * (404), so order ids leak nothing.
 */
export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/checkout/confirmation/${orderId}`);

  const order = await getOrderForUser(user.id, orderId);
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <div className="rounded-xl border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Thank you — your order is placed</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Order <span className="font-medium text-foreground">{order.orderNumber}</span> ·{" "}
          {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
          {PAYMENT_STATUS_LABELS[order.paymentStatus]}
        </p>
        {order.paymentMethod === "SIMULATED_CARD" ? (
          <p className="mt-2 text-sm text-muted-foreground">
            This was a simulated demo payment
            {order.paymentRef ? ` (reference ${order.paymentRef})` : ""} — no real money moved.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            You pay the courier when the order is delivered.
          </p>
        )}

        <OrderContents order={order} />

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/products">Continue shopping</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/account">Go to your account</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
