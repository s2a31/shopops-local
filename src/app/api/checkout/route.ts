import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";

import { checkoutSchema } from "@/features/checkout/schemas";
import { placeOrder } from "@/server/services/checkout.service";

export const POST = apiRoute(async (request) => {
  const user = await requireUser();
  const input = await parseJsonBody(request, checkoutSchema);
  const order = await placeOrder(user.id, input);
  return NextResponse.json(order, { status: 201 });
});
