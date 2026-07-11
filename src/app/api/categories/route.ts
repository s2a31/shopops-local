import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";

import { listCategories } from "@/server/services/catalog.service";

export const GET = apiRoute(async () => {
  const categories = await listCategories();
  return NextResponse.json({ categories });
});
