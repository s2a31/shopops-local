import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import { adminCategoryCreateSchema } from "@/features/admin/categories/schemas";
import { createCategory, listAdminCategories } from "@/server/services/admin.service";

export const GET = apiRoute(async () => {
  await requireAdmin();
  return NextResponse.json(await listAdminCategories());
});

export const POST = apiRoute(async (request) => {
  await requireAdmin();
  const input = await parseJsonBody(request, adminCategoryCreateSchema);
  const category = await createCategory(input);
  return NextResponse.json(category, { status: 201 });
});
