import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { AppError } from "@/lib/errors";

import { getProductBySlug } from "@/server/services/catalog.service";

export const GET = apiRoute(async (_request, context) => {
  const { slug } = await context.params;
  const product = await getProductBySlug(slug ?? "");
  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found.");
  }
  return NextResponse.json({ product });
});
