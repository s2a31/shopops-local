import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { PRODUCT_SORT_OPTIONS, type ProductFilters } from "@/features/catalog/schemas";

const SORT_LABELS: Record<(typeof PRODUCT_SORT_OPTIONS)[number], string> = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name (A–Z)",
};

interface FilterToolbarProps {
  filters: ProductFilters;
  categories: { slug: string; name: string }[];
}

/**
 * Plain GET form — filtering works entirely through the URL and needs no
 * client-side JavaScript. Native inputs and selects throughout.
 */
export function FilterToolbar({ filters, categories }: FilterToolbarProps) {
  const hasActiveFilters =
    filters.q !== undefined ||
    filters.category !== undefined ||
    filters.minPrice !== undefined ||
    filters.maxPrice !== undefined ||
    filters.sort !== "newest";

  const selectClass =
    "h-8 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

  return (
    <form
      method="get"
      action="/products"
      className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
    >
      <div className="flex min-w-40 flex-1 flex-col gap-1">
        <Label htmlFor="filter-q">Search</Label>
        <Input
          id="filter-q"
          type="search"
          name="q"
          defaultValue={filters.q ?? ""}
          placeholder="Search products…"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-category">Category</Label>
        <select
          id="filter-category"
          name="category"
          defaultValue={filters.category ?? ""}
          className={selectClass}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-min-price">Min price (€)</Label>
        <Input
          id="filter-min-price"
          type="number"
          name="minPrice"
          min={0}
          step={1}
          defaultValue={filters.minPrice ?? ""}
          className="w-28"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-max-price">Max price (€)</Label>
        <Input
          id="filter-max-price"
          type="number"
          name="maxPrice"
          min={0}
          step={1}
          defaultValue={filters.maxPrice ?? ""}
          className="w-28"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="filter-sort">Sort by</Label>
        <select id="filter-sort" name="sort" defaultValue={filters.sort} className={selectClass}>
          {PRODUCT_SORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {SORT_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit">Apply filters</Button>
        {hasActiveFilters && (
          <Button asChild variant="ghost">
            <Link href="/products">Clear</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
