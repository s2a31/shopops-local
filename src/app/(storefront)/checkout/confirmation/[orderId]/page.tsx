import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/money";

import { Button } from "@/components/ui/button";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from "@/features/checkout/constants";
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

        <h2 className="mt-6 text-base font-semibold">Items</h2>
        <ul className="mt-2 divide-y text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 py-2">
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {item.product.isActive ? (
                    <Link href={`/products/${item.product.slug}`} className="hover:underline">
                      {item.productName}
                    </Link>
                  ) : (
                    item.productName
                  )}
                </span>
                <span className="text-muted-foreground">
                  {formatMoney(item.unitPriceCents)} × {item.quantity}
                </span>
              </span>
              <span className="shrink-0 font-medium">{formatMoney(item.lineTotalCents)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 flex flex-col gap-1.5 border-t pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-medium">{formatMoney(order.subtotalCents)}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd className="font-medium">
              {order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)}
            </dd>
          </div>
          <div className="mt-1 flex items-center justify-between border-t pt-2 text-base">
            <dt className="font-medium">Total</dt>
            <dd className="font-semibold">{formatMoney(order.totalCents)}</dd>
          </div>
        </dl>

        <h2 className="mt-6 text-base font-semibold">Delivery address</h2>
        <address className="mt-2 text-sm not-italic text-muted-foreground">
          {order.shippingName}
          <br />
          {order.shippingStreet}
          <br />
          {order.shippingPostalCode} {order.shippingCity}
          <br />
          {order.shippingCountry}
          {order.shippingPhone && (
            <>
              <br />
              {order.shippingPhone}
            </>
          )}
        </address>

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
