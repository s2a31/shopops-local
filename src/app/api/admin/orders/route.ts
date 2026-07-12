import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import { adminOrderFiltersSchema } from "@/features/admin/orders/schemas";
import { listAdminOrders } from "@/server/services/admin.service";

export const GET = apiRoute(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const filters = adminOrderFiltersSchema.parse(Object.fromEntries(url.searchParams));
  return NextResponse.json(await listAdminOrders(filters));
});
