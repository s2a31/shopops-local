import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

/**
 * Server-side guard for every /account route. The proxy only does an
 * optimistic cookie check; this layout validates the session against the
 * database on every request.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");
  return <>{children}</>;
}
