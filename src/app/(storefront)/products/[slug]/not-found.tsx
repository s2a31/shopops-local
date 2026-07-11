import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Product not found</h1>
      <p className="text-muted-foreground">
        This product doesn&apos;t exist or is no longer available.
      </p>
      <Button asChild>
        <Link href="/products">Browse all products</Link>
      </Button>
    </div>
  );
}
