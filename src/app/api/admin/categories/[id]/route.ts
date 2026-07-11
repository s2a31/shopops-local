import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import { adminCategoryUpdateSchema } from "@/features/admin/categories/schemas";
import { updateCategory } from "@/server/services/admin.service";

export const PATCH = apiRoute(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await parseJsonBody(request, adminCategoryUpdateSchema);
  return NextResponse.json(await updateCategory(id ?? "", input));
});
