import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";

import { cancelOrderForUser } from "@/server/services/order.service";

export const POST = apiRoute(async (_request, context) => {
  const user = await requireUser();
  const { id } = await context.params;
  const order = await cancelOrderForUser(user.id, id ?? "");
  return NextResponse.json(order);
});
