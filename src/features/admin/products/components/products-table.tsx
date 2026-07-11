"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ADMIN_PRODUCT_STATUS_FILTERS,
  type AdminProductStatusFilter,
} from "@/features/admin/products/schemas";
import type { AdminProductListResult } from "@/server/services/admin.service";

const STATUS_LABELS: Record<AdminProductStatusFilter, string> = {
  all: "All statuses",
  active: "Active",
  inactive: "Inactive",
};

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

interface Filters {
  q: string;
  status: AdminProductStatusFilter;
  category: string;
  lowStock: boolean;
  page: number;
}

const DEFAULT_FILTERS: Filters = { q: "", status: "all", category: "", lowStock: false, page: 1 };

function toSearchParams(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.lowStock) params.set("lowStock", "true");
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function ProductsTable({ categories }: { categories: { slug: string; name: string }[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // The search box is applied on submit, not per keystroke.
  const [search, setSearch] = useState("");

  const query = useQuery({
    queryKey: ["admin-products", filters],
    queryFn: () =>
      apiFetch<AdminProductListResult>(`/api/admin/products${toSearchParams(filters)}`),
    placeholderData: (previous) => previous,
  });

  const update = (patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }));
  };

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          update({ q: search.trim() });
        }}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <Label htmlFor="admin-products-q">Search</Label>
          <Input
            id="admin-products-q"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or slug…"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="admin-products-status">Status</Label>
          <select
            id="admin-products-status"
            value={filters.status}
            onChange={(event) => update({ status: event.target.value as AdminProductStatusFilter })}
            className={selectClass}
          >
            {ADMIN_PRODUCT_STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="admin-products-category">Category</Label>
          <select
            id="admin-products-category"
            value={filters.category}
            onChange={(event) => update({ category: event.target.value })}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-9 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.lowStock}
            onChange={(event) => update({ lowStock: event.target.checked })}
            className="accent-primary"
          />
          Low stock only
        </label>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {query.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only" role="status">
            Loading products…
          </span>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            The product list could not be loaded. {query.error.message}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No products match these filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableCaption className="sr-only">
                Products, including inactive ones — {query.data.total} total
              </TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Product</TableHead>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col" className="text-right">
                    Price
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Stock
                  </TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">Updated</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.images[0] ? (
                          <Image
                            src={product.images[0].url}
                            alt=""
                            width={40}
                            height={30}
                            className="h-8 w-10 shrink-0 rounded object-cover"
                          />
                        ) : (
                          <span aria-hidden="true" className="h-8 w-10 shrink-0 rounded bg-muted" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium">{product.name}</p>
                          <p className="truncate text-xs text-muted-foreground">/{product.slug}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.category.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(product.priceCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {product.stockQuantity === 0 ? (
                        <Badge variant="destructive">Out of stock</Badge>
                      ) : product.stockQuantity <= product.lowStockThreshold ? (
                        <Badge variant="secondary">{product.stockQuantity} left</Badge>
                      ) : (
                        product.stockQuantity
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={product.isActive ? "outline" : "secondary"}>
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(new Date(product.updatedAt))}
                    </TableCell>
                    <TableCell>
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          aria-label={`Edit ${product.name}`}
                        >
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav aria-label="Product pages" className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground" aria-live="polite">
              Page {query.data.page} of {query.data.totalPages} — {query.data.total} products
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.page <= 1}
                onClick={() => update({ page: query.data.page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.page >= query.data.totalPages}
                onClick={() => update({ page: query.data.page + 1 })}
              >
                Next
              </Button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
