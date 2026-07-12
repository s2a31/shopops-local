import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import { adminOrderStatusSchema } from "@/features/admin/orders/schemas";
import { updateOrderStatus } from "@/server/services/admin.service";

export const PATCH = apiRoute(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await parseJsonBody(request, adminOrderStatusSchema);
  return NextResponse.json(await updateOrderStatus(id ?? "", input.status));
});
