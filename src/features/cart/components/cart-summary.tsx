"use client";

import { formatMoney, FREE_SHIPPING_THRESHOLD_CENTS } from "@/lib/money";

import type { ValidatedCart } from "@/server/services/cart.service";

export function CartSummary({ cart }: { cart: ValidatedCart }) {
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD_CENTS - cart.subtotalCents;

  return (
    <dl className="flex flex-col gap-1.5 text-sm">
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">Subtotal</dt>
        <dd className="font-medium">{formatMoney(cart.subtotalCents)}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-muted-foreground">Shipping</dt>
        <dd className="font-medium">
          {cart.shippingCents === 0 ? "Free" : formatMoney(cart.shippingCents)}
        </dd>
      </div>
      {remainingForFreeShipping > 0 && cart.subtotalCents > 0 && (
        <p className="text-xs text-muted-foreground">
          Add {formatMoney(remainingForFreeShipping)} more for free shipping.
        </p>
      )}
      <div className="mt-1 flex items-center justify-between border-t pt-2 text-base">
        <dt className="font-medium">Total</dt>
        <dd className="font-semibold">{formatMoney(cart.totalCents)}</dd>
      </div>
    </dl>
  );
}
