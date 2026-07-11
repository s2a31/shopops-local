import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/features/admin/products/components/products-table";
import { listAdminCategories } from "@/server/services/admin.service";

export const metadata: Metadata = { title: "Products — admin" };

export default async function AdminProductsPage() {
  const categories = await listAdminCategories();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>
      <div className="mt-6">
        <ProductsTable categories={categories.map(({ slug, name }) => ({ slug, name }))} />
      </div>
    </div>
  );
}
