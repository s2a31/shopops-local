import { cache } from "react";

import { readSessionCookie } from "@/lib/auth/cookies";
import { validateSessionToken, type SessionUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

/**
 * Reads and validates the current session once per request (React cache).
 * Missing, invalid, and expired sessions all resolve to null — pages and
 * handlers never see the difference, by design.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = await readSessionCookie();
  if (!token) return null;
  const session = await validateSessionToken(token);
  return session?.user ?? null;
});

/** API guard: any authenticated user. Throws 401 for the error envelope. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError("UNAUTHORIZED", "You must be signed in to do this.");
  }
  return user;
}

/** API guard: administrators only. 401 without a session, 403 with a non-admin one. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Administrator access is required.");
  }
  return user;
}
