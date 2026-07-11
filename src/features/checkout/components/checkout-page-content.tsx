"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartValidation } from "@/features/cart/hooks/use-cart-validation";
import { useHasMounted } from "@/features/cart/hooks/use-has-mounted";
import { useCartStore } from "@/features/cart/store";
import { CheckoutForm } from "@/features/checkout/components/checkout-form";
import { CheckoutSummary } from "@/features/checkout/components/checkout-summary";
import type { ShippingAddressSnapshot } from "@/server/services/order.service";

export function CheckoutPageContent({
  prefillAddress,
}: {
  prefillAddress: ShippingAddressSnapshot | null;
}) {
  const mounted = useHasMounted();
  const items = useCartStore((state) => state.items);
  const { data, isPending, isError, refetch } = useCartValidation();
  const [placed, setPlaced] = useState(false);

  // Checked first: placing an order clears the cart, and this must not flash
  // the empty-cart state while the confirmation page loads.
  if (placed) {
    return (
      <div role="status" className="mt-8 rounded-xl border p-12 text-center">
        <h2 className="text-lg font-medium">Order placed</h2>
        <p className="mt-2 text-sm text-muted-foreground">Taking you to your confirmation…</p>
      </div>
    );
  }

  if (!mounted || (items.length > 0 && (isPending || !data) && !isError)) {
    return (
      <div aria-busy="true" className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <span role="status" className="sr-only">
          Loading checkout…
        </span>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
        <h2 className="text-lg font-medium">Your cart is empty</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add something to your cart before checking out.
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

  return (
    <>
      {!data.purchasable && (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
        >
          Some items in your cart are not available as requested.{" "}
          <Link href="/cart" className="font-medium underline">
            Review your cart
          </Link>{" "}
          before placing the order.
        </p>
      )}
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1fr_20rem]">
        <CheckoutForm
          prefillAddress={prefillAddress}
          purchasable={data.purchasable}
          onPlaced={() => setPlaced(true)}
        />
        <CheckoutSummary cart={data} />
      </div>
    </>
  );
}
