import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";

import { getAdminOrder } from "@/server/services/admin.service";

export const GET = apiRoute(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const order = await getAdminOrder(id ?? "");
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found.");
  }
  return NextResponse.json(order);
});
