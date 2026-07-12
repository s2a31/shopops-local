import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import { adminCustomerFiltersSchema } from "@/features/admin/customers/schemas";
import { listAdminCustomers } from "@/server/services/admin.service";

export const GET = apiRoute(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const filters = adminCustomerFiltersSchema.parse(Object.fromEntries(url.searchParams));
  return NextResponse.json(await listAdminCustomers(filters));
});
