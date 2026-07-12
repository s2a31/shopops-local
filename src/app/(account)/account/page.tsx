import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/guards";

import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/features/auth/components/logout-button";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  // The layout redirects guests too, but layouts and pages render in
  // parallel — the page must handle null itself, never assert it away.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">My account</h1>
      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-medium text-muted-foreground">Name</dt>
        <dd>{user.name}</dd>
        <dt className="font-medium text-muted-foreground">Email</dt>
        <dd>{user.email}</dd>
      </dl>
      <div className="mt-8 flex items-center gap-3">
        <Button asChild variant="outline">
          <Link href="/account/orders">Order history</Link>
        </Button>
        <LogoutButton />
      </div>
    </div>
  );
}
