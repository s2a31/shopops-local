import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";

import { getOrderForUser } from "@/server/services/order.service";

export const GET = apiRoute(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const order = await getOrderForUser(user.id, id ?? "");
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }
  return NextResponse.json(order);
});
