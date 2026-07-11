import { z } from "zod";

import { MAX_DISTINCT_LINES, MAX_LINE_QUANTITY } from "@/features/cart/constants";

/**
 * Wire schema for cart contents. Shared by POST /api/cart/validate and (from
 * M7) the checkout endpoint, so both enforce identical limits.
 */
export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const cartItemsSchema = z.object({
  items: z.array(cartLineSchema).min(1).max(MAX_DISTINCT_LINES),
});

export type CartItemsInput = z.infer<typeof cartItemsSchema>;
