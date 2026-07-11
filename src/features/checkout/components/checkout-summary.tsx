"use client";

import { formatMoney } from "@/lib/money";

import { CartSummary } from "@/features/cart/components/cart-summary";
import type { ValidatedCart, ValidatedCartLine } from "@/server/services/cart.service";

const ISSUE_MESSAGE: Record<NonNullable<ValidatedCartLine["issue"]>, string> = {
  MISSING: "No longer available",
  INACTIVE: "No longer sold",
  OUT_OF_STOCK: "Out of stock",
  INSUFFICIENT_STOCK: "Not enough stock",
};

/** Read-only order summary for the checkout page; quantities change on the cart page. */
export function CheckoutSummary({ cart }: { cart: ValidatedCart }) {
  return (
    <aside aria-label="Order summary" className="rounded-xl border bg-card p-4">
      <h2 className="text-base font-semibold">Order summary</h2>
      <ul className="mt-2 divide-y text-sm">
        {cart.lines.map((line) => (
          <li key={line.productId} className="flex items-baseline justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {line.product?.name ?? "Unavailable product"}
              </span>
              <span className="text-muted-foreground">Qty {line.requestedQuantity}</span>
              {line.issue && (
                <span className="block font-medium text-destructive">
                  {ISSUE_MESSAGE[line.issue]}
                </span>
              )}
            </span>
            <span className="shrink-0 font-medium">
              {line.lineTotalCents !== null ? formatMoney(line.lineTotalCents) : "—"}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t pt-3">
        <CartSummary cart={cart} />
      </div>
    </aside>
  );
}
