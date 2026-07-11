"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CartLineItem } from "@/features/cart/components/cart-line-item";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCartValidation } from "@/features/cart/hooks/use-cart-validation";
import { useCartStore } from "@/features/cart/store";
import { useCartUiStore } from "@/features/cart/ui-store";

export function CartDrawer() {
  const open = useCartUiStore((state) => state.drawerOpen);
  const setOpen = useCartUiStore((state) => state.setDrawerOpen);
  const items = useCartStore((state) => state.items);
  const { data, isPending, isError, refetch } = useCartValidation();

  const isEmpty = items.length === 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>Shopping cart</SheetTitle>
          <SheetDescription className="sr-only">
            Review the items in your cart, change quantities, or continue to checkout.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          {isEmpty ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Your cart is empty.</p>
          ) : isError ? (
            <div role="alert" className="py-8 text-center text-sm">
              <p className="font-medium text-destructive">Could not load your cart.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : isPending || !data ? (
            <div aria-busy="true" className="flex flex-col gap-3 py-3">
              <span role="status" className="sr-only">
                Loading cart…
              </span>
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-14 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ul className="divide-y">
              {data.lines.map((line) => (
                <li key={line.productId}>
                  <CartLineItem line={line} compact />
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isEmpty && data && !isError && (
          <SheetFooter className="border-t">
            <CartSummary cart={data} />
            <div className="flex flex-col gap-2">
              <Button asChild onClick={() => setOpen(false)} disabled={!data.purchasable}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button asChild variant="outline" onClick={() => setOpen(false)}>
                <Link href="/cart">View cart</Link>
              </Button>
            </div>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
