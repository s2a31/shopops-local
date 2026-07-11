import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ApiError, apiFetch } from "@/lib/api-client";

import type { CheckoutInput } from "@/features/checkout/schemas";
import type { PlacedOrder } from "@/server/services/checkout.service";

/**
 * Places the order. On stock conflicts the cart-validation query is
 * invalidated so every cart surface immediately shows the fresh stock
 * situation the server just reported.
 */
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) =>
      apiFetch<PlacedOrder>("/api/checkout", { method: "POST", body: input }),
    onError: (error) => {
      if (
        error instanceof ApiError &&
        (error.code === "INSUFFICIENT_STOCK" || error.code === "CONFLICT")
      ) {
        void queryClient.invalidateQueries({ queryKey: ["cart-validate"] });
      }
    },
  });
}
