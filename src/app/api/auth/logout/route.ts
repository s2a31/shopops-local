import { apiRoute } from "@/lib/api";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookies";
import { requireUser } from "@/lib/auth/guards";
import { logoutSession } from "@/server/services/auth.service";

export const POST = apiRoute(async () => {
  await requireUser();
  const token = await readSessionCookie();
  if (token) await logoutSession(token);
  await clearSessionCookie();
  return new Response(null, { status: 204 });
});
