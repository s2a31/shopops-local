import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Permission denied" };

export default function ForbiddenPage() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-col items-center justify-center px-4 text-center"
    >
      <p className="text-sm font-medium text-muted-foreground">403</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Permission denied</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        Your account is not allowed to view this page. If you think it should be, sign in with an
        account that has the right role.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Back to the shop</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Sign in differently</Link>
        </Button>
      </div>
    </main>
  );
}
