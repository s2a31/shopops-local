import type { ProductFilters } from "@/features/catalog/schemas";

/**
 * Builds a /products URL from filters, omitting defaults so URLs stay clean
 * and shareable (e.g. /products?category=audio&sort=price-asc&page=2).
 */
export function productsHref(
  filters: ProductFilters,
  overrides: Partial<ProductFilters> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.minPrice !== undefined) params.set("minPrice", String(merged.minPrice));
  if (merged.maxPrice !== undefined) params.set("maxPrice", String(merged.maxPrice));
  if (merged.sort !== "newest") params.set("sort", merged.sort);
  if (merged.page > 1) params.set("page", String(merged.page));
  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}
