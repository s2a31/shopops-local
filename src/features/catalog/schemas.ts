import { z } from "zod";

export const PRODUCT_SORT_OPTIONS = ["newest", "price-asc", "price-desc", "name"] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

/**
 * Catalogue filters as they appear in the URL (?q=&category=&minPrice=&maxPrice=&sort=&page=).
 * Prices are whole euros in the URL for readability and converted to cents at
 * the service boundary. Invalid values fall back to defaults instead of erroring —
 * a shared or mistyped URL should still show products.
 */
export const productFiltersSchema = z.object({
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : undefined)),
  category: z
    .string()
    .trim()
    .max(100)
    .optional()
    .catch(undefined)
    .transform((v) => (v ? v : undefined)),
  // Empty strings (from GET-form fields left blank) must mean "no filter" —
  // z.coerce alone would turn "" into 0, silently filtering everything out.
  minPrice: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce.number().int().min(0).max(1_000_000).optional(),
    )
    .catch(undefined),
  maxPrice: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.coerce.number().int().min(0).max(1_000_000).optional(),
    )
    .catch(undefined),
  sort: z.enum(PRODUCT_SORT_OPTIONS).catch("newest"),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type ProductFilters = z.infer<typeof productFiltersSchema>;

/** Parses raw searchParams (values possibly arrays) into safe filters. */
export function parseProductFilters(params: Record<string, string | string[] | undefined>) {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  return productFiltersSchema.parse({
    q: first(params.q),
    category: first(params.category),
    minPrice: first(params.minPrice),
    maxPrice: first(params.maxPrice),
    sort: first(params.sort),
    page: first(params.page),
  });
}
