"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCartValidation } from "@/features/cart/hooks/use-cart-validation";
import { useHasMounted } from "@/features/cart/hooks/use-has-mounted";
import { useCartStore } from "@/features/cart/store";

export function CartPageContent() {
  const mounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const { data, isPending, isError, refetch } = useCartValidation();

  // Until the persisted store has mounted, render the same skeleton the
  // server rendered — no hydration mismatch, no empty-cart flash.
  if (!mounted || (items.length > 0 && (isPending || !data) && !isError)) {
    return (
      <div aria-busy="true" className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <span role="status" className="sr-only">
          Loading cart…
        </span>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-20 rounded-lg" />
              <div className="flex-1 space-y-2 py-1">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
        <h2 className="text-lg font-medium">Your cart is empty</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Find something you like in the catalogue and add it to your cart.
        </p>
        <Button asChild className="mt-6">
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="mt-8 rounded-xl border border-destructive/40 p-12 text-center">
        <h2 className="text-lg font-medium text-destructive">Could not load your cart</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong while checking prices and stock. Your items are still saved.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const issueCount = data.lines.filter((line) => line.issue !== null).length;

  return (
    <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        {issueCount > 0 && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          >
            {issueCount === 1 ? "One item needs" : `${issueCount} items need`} your attention before
            checkout.
          </p>
        )}
        <ul className="divide-y">
          {data.lines.map((line) => (
            <li key={line.productId}>
              <CartLineItem line={line} />
            </li>
          ))}
        </ul>
      </div>

      <aside aria-label="Order summary" className="rounded-xl border bg-card p-4">
        <h2 className="text-base font-semibold">Summary</h2>
        <div className="mt-3">
          <CartSummary cart={data} />
        </div>
        {data.purchasable ? (
          <Button asChild className="mt-4 w-full">
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>
        ) : (
          <>
            <Button className="mt-4 w-full" disabled>
              Proceed to checkout
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Fix the highlighted items to continue.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
