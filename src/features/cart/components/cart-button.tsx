"use client";

import { ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useHasMounted } from "@/features/cart/hooks/use-has-mounted";
import { selectCartCount, useCartStore } from "@/features/cart/store";
import { useCartUiStore } from "@/features/cart/ui-store";

/**
 * Header cart trigger. The count comes from persisted client state, so it
 * renders only after mount (the server always renders an empty cart).
 */
export function CartButton() {
  const mounted = useHasMounted();
  const count = useCartStore(selectCartCount);
  const setDrawerOpen = useCartUiStore((state) => state.setDrawerOpen);

  const shownCount = mounted ? count : 0;
  const label = `Open cart (${shownCount} item${shownCount === 1 ? "" : "s"})`;

  return (
    <Button
      variant="ghost"
      className="relative"
      aria-label={label}
      onClick={() => setDrawerOpen(true)}
    >
      <ShoppingCart aria-hidden="true" className="size-4" />
      <span className="max-sm:sr-only">Cart</span>
      {mounted && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
