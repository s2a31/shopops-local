import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";

import { orderPageSchema } from "@/features/orders/schemas";
import { listOrdersForUser } from "@/server/services/order.service";

export const GET = apiRoute(async (request) => {
  const user = await requireUser();
  const page = orderPageSchema.parse(new URL(request.url).searchParams.get("page") ?? undefined);
  const result = await listOrdersForUser(user.id, page);
  return NextResponse.json(result);
});
