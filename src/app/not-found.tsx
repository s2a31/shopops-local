import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found" };

/**
 * Global 404 boundary: renders for unknown URLs and for notFound() thrown by
 * pages without a closer boundary (e.g. an order the visitor doesn't own —
 * deliberately indistinguishable from a missing one).
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-svh flex-col items-center justify-center px-4 text-center"
    >
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        This page doesn&apos;t exist or is no longer available.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link href="/">Back to the shop</Link>
        </Button>
      </div>
    </main>
  );
}
