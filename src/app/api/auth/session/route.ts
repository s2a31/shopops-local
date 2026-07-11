import { NextResponse } from "next/server";

import { apiRoute } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/guards";

/** Client-hydration helper: returns the signed-in user or null, never an error. */
export const GET = apiRoute(async () => {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
});
