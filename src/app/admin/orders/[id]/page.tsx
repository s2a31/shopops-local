import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

import { Badge } from "@/components/ui/badge";
import { OrderStatusControl } from "@/features/admin/orders/components/order-status-control";
import { ORDER_STATUS_BADGE_VARIANTS, ORDER_STATUS_LABELS } from "@/features/orders/constants";
import { getAdminOrder } from "@/server/services/admin.service";

export const metadata: Metadata = { title: "Order detail — admin" };

const PAYMENT_LABELS = {
  CASH_ON_DELIVERY: "Cash on delivery",
  SIMULATED_CARD: "Simulated card",
} as const;

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
        <Badge variant={ORDER_STATUS_BADGE_VARIANTS[order.status]}>
          {ORDER_STATUS_LABELS[order.status]}
        </Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Placed {formatDate(order.createdAt)} by {order.user.name} ({order.user.email})
        {order.cancelledAt ? ` · cancelled ${formatDate(order.cancelledAt)}` : ""}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="admin-order-items" className="lg:col-span-2">
          <h2 id="admin-order-items" className="text-base font-semibold">
            Items
          </h2>
          <div className="mt-3 overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm">
              <caption className="sr-only">Order items</caption>
              <thead>
                <tr className="border-b text-left">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Product
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Unit price
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Qty
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Line total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3">
                      {item.product ? (
                        <Link href={`/products/${item.product.slug}`} className="hover:underline">
                          {item.productName}
                        </Link>
                      ) : (
                        item.productName
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(item.unitPriceCents)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatMoney(item.lineTotalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t">
                <tr>
                  <th scope="row" colSpan={3} className="px-4 py-2 text-right font-normal">
                    Subtotal
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {formatMoney(order.subtotalCents)}
                  </td>
                </tr>
                <tr>
                  <th scope="row" colSpan={3} className="px-4 py-2 text-right font-normal">
                    Shipping
                  </th>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {order.shippingCents === 0 ? "Free" : formatMoney(order.shippingCents)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <th scope="row" colSpan={3} className="px-4 py-3 text-right">
                    Total
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatMoney(order.totalCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-6 rounded-xl border bg-card p-5">
            <h2 className="text-base font-semibold">Fulfillment</h2>
            <div className="mt-3">
              <OrderStatusControl
                orderId={order.id}
                orderNumber={order.orderNumber}
                status={order.status}
              />
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-6">
          <section aria-labelledby="admin-order-payment" className="rounded-xl border bg-card p-5">
            <h2 id="admin-order-payment" className="text-base font-semibold">
              Payment
            </h2>
            <dl className="mt-3 flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Method</dt>
                <dd>{PAYMENT_LABELS[order.paymentMethod]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Status</dt>
                <dd>{order.paymentStatus.toLowerCase()}</dd>
              </div>
              {order.paymentRef && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono text-xs">{order.paymentRef}</dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="admin-order-shipping" className="rounded-xl border bg-card p-5">
            <h2 id="admin-order-shipping" className="text-base font-semibold">
              Shipping address
            </h2>
            <address className="mt-3 text-sm not-italic leading-6 text-muted-foreground">
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
          </section>
        </div>
      </div>
    </div>
  );
}
