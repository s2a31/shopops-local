import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import {
  adminProductCreateSchema,
  adminProductFiltersSchema,
} from "@/features/admin/products/schemas";
import { createProduct, listAdminProducts } from "@/server/services/admin.service";

export const GET = apiRoute(async (request) => {
  await requireAdmin();
  const url = new URL(request.url);
  const filters = adminProductFiltersSchema.parse(Object.fromEntries(url.searchParams));
  return NextResponse.json(await listAdminProducts(filters));
});

export const POST = apiRoute(async (request) => {
  const admin = await requireAdmin();
  const input = await parseJsonBody(request, adminProductCreateSchema);
  const product = await createProduct(input, admin.id);
  return NextResponse.json(product, { status: 201 });
});
