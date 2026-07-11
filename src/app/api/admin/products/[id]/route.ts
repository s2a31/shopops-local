import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors";

import { adminProductUpdateSchema } from "@/features/admin/products/schemas";
import { getAdminProduct, updateProduct } from "@/server/services/admin.service";

export const GET = apiRoute(async (_request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const product = await getAdminProduct(id ?? "");
  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found.");
  }
  return NextResponse.json(product);
});

export const PATCH = apiRoute(async (request, context) => {
  await requireAdmin();
  const { id } = await context.params;
  const input = await parseJsonBody(request, adminProductUpdateSchema);
  return NextResponse.json(await updateProduct(id ?? "", input));
});
