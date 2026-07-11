import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { AdminNav } from "@/components/layout/admin-nav";
import { SkipLink } from "@/components/layout/skip-link";

/**
 * Server-side guard for every /admin route: guests go to login, signed-in
 * non-admins to the 403 page. The proxy's cookie check is only a UX shortcut;
 * this runs against the database on every request.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/403");

  return (
    <>
      <SkipLink />
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="text-base font-semibold tracking-tight">
              ShopOps Admin
            </Link>
            <span className="text-xs text-muted-foreground">signed in as {user.name}</span>
          </div>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Back to storefront
          </Link>
        </div>
        <div className="mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6">
          <AdminNav />
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
        {children}
      </main>
    </>
  );
}
