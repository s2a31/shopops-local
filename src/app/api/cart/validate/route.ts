import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";

import { cartItemsSchema } from "@/features/cart/schemas";
import { validateCart } from "@/server/services/cart.service";

/**
 * Public: guests own carts too. State-changing method (POST), so the apiRoute
 * wrapper enforces the Origin check. Always 200 — per-line problems are data
 * (issues in the payload), not transport errors.
 */
export const POST = apiRoute(async (request) => {
  const { items } = await parseJsonBody(request, cartItemsSchema);
  const result = await validateCart(items);
  return NextResponse.json(result);
});
