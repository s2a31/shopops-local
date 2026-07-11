import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guards";

import { getDashboardSummary } from "@/server/services/admin.service";

export const GET = apiRoute(async () => {
  await requireAdmin();
  const summary = await getDashboardSummary();
  return NextResponse.json(summary);
});
