import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";

import { parseProductFilters } from "@/features/catalog/schemas";
import { listProducts } from "@/server/services/catalog.service";

export const GET = apiRoute(async (request) => {
  const url = new URL(request.url);
  const filters = parseProductFilters(Object.fromEntries(url.searchParams));
  const result = await listProducts(filters);
  return NextResponse.json(result);
});
