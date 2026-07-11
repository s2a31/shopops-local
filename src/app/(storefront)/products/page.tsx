import type { Metadata } from "next";

import { FilterToolbar } from "@/features/catalog/components/filter-toolbar";
import { Pagination } from "@/features/catalog/components/pagination";
import { ProductCard } from "@/features/catalog/components/product-card";
import { parseProductFilters } from "@/features/catalog/schemas";
import { productsHref } from "@/features/catalog/url";
import { listCategories, listProducts } from "@/server/services/catalog.service";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseProductFilters(await searchParams);
  const [result, categories] = await Promise.all([listProducts(filters), listCategories()]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Products</h1>

      <div className="mt-6">
        <FilterToolbar filters={filters} categories={categories} />
      </div>

      <p aria-live="polite" className="mt-4 text-sm text-muted-foreground">
        {result.total === 0
          ? "No products found."
          : `${result.total} product${result.total === 1 ? "" : "s"} found.`}
      </p>

      {result.items.length > 0 ? (
        <ul className="mt-4 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-xl border border-dashed p-12 text-center">
          <h2 className="text-lg font-medium">Nothing matches these filters</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a different search term, widen the price range, or clear the filters.
          </p>
        </div>
      )}

      <div className="mt-8">
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          hrefFor={(page) => productsHref(filters, { page })}
        />
      </div>
    </div>
  );
}
