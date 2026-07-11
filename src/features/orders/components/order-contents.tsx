import Link from "next/link";

import { formatMoney } from "@/lib/money";

import type { OrderDetail } from "@/server/services/order.service";

/**
 * Items, totals, and delivery address of one order — shared by the checkout
 * confirmation and the account order detail page. Server-renderable.
 */
export function OrderContents({ order }: { order: OrderDetail }) {
  return (
    <>
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
    </>
  );
}
