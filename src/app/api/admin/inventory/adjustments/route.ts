import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import {
  adminAdjustmentCreateSchema,
  adminAdjustmentFiltersSchema,
} from "@/features/admin/inventory/schemas";
import { createAdjustment, listAdjustments } from "@/server/services/inventory.service";

export const GET = apiRoute(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const filters = adminAdjustmentFiltersSchema.parse(Object.fromEntries(url.searchParams));
  return NextResponse.json(await listAdjustments(filters));
});

export const POST = apiRoute(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJsonBody(request, adminAdjustmentCreateSchema);
  const result = await createAdjustment(input, admin.id);
  return NextResponse.json(result, { status: 201 });
});
