import { NextResponse } from "next/server";

import { apiRoute, parseJsonBody } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth/cookies";
import { enforceRateLimit } from "@/lib/rate-limit";

import { loginSchema } from "@/features/auth/schemas";
import { loginUser } from "@/server/services/auth.service";

export const POST = apiRoute(async (request) => {
  const input = await parseJsonBody(request, loginSchema);
  enforceRateLimit(`login:${input.email}`, { limit: 10, windowMs: 15 * 60 * 1000 });

  const { user, token, expiresAt } = await loginUser(input);
  await setSessionCookie(token, expiresAt);
  return NextResponse.json({ user });
});
