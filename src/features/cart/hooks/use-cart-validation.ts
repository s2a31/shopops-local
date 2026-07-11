import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";

import { useHasMounted } from "@/features/cart/hooks/use-has-mounted";
import { useCartStore } from "@/features/cart/store";
import type { ValidatedCart } from "@/server/services/cart.service";

/**
 * Canonical cart data: sends { productId, quantity } to the server and gets
 * back names, prices, stock, and per-line issues. Keyed on the cart contents,
 * so any quantity change refetches fresh data.
 */
export function useCartValidation() {
  const mounted = useHasMounted();
  const items = useCartStore((state) => state.items);

  return useQuery({
    queryKey: ["cart-validate", items],
    queryFn: () =>
      apiFetch<ValidatedCart>("/api/cart/validate", { method: "POST", body: { items } }),
    enabled: mounted && items.length > 0,
    placeholderData: (previous) => previous,
  });
}
