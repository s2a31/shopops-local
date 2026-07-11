"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ApiError, apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  MANUAL_ADJUSTMENT_REASONS,
  adminAdjustmentFormSchema,
  type AdminAdjustmentFormInput,
  type AdminAdjustmentFormValues,
} from "@/features/admin/inventory/schemas";
import type { AdminProductListItem, AdminProductListResult } from "@/server/services/admin.service";
import type { AdjustmentListResult, AppliedAdjustment } from "@/server/services/inventory.service";

const REASON_LABELS: Record<string, string> = {
  INITIAL_STOCK: "Initial stock",
  RESTOCK: "Restock",
  MANUAL_CORRECTION: "Manual correction",
  ORDER_PLACED: "Order placed",
  ORDER_CANCELLED: "Order cancelled",
};

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

function AdjustDialogForm({
  product,
  onDone,
}: {
  product: AdminProductListItem;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminAdjustmentFormInput, unknown, AdminAdjustmentFormValues>({
    resolver: zodResolver(adminAdjustmentFormSchema),
    defaultValues: { delta: "", reason: "RESTOCK", note: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: AdminAdjustmentFormValues) =>
      apiFetch<AppliedAdjustment>("/api/admin/inventory/adjustments", {
        method: "POST",
        body: { productId: product.id, ...values },
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["admin-adjustments"] });
      toast.success(`${product.name} is now at ${result.stockQuantity} units.`);
      onDone();
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      await mutation.mutateAsync(values);
    } catch (error) {
      setSubmitError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again.",
      );
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Current stock: <span className="font-medium text-foreground">{product.stockQuantity}</span>{" "}
        units
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adjust-delta">Change (use a negative number to remove)</Label>
        <Input
          id="adjust-delta"
          type="number"
          aria-invalid={errors.delta ? true : undefined}
          aria-describedby={errors.delta ? "adjust-delta-error" : undefined}
          {...register("delta")}
        />
        {errors.delta?.message && (
          <p id="adjust-delta-error" className="text-sm text-destructive">
            {errors.delta.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adjust-reason">Reason</Label>
        <select id="adjust-reason" className={selectClass} {...register("reason")}>
          {MANUAL_ADJUSTMENT_REASONS.map((reason) => (
            <option key={reason} value={reason}>
              {REASON_LABELS[reason]}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="adjust-note">Note (optional)</Label>
        <Input id="adjust-note" type="text" {...register("note")} />
      </div>

      <div aria-live="polite">
        {submitError && (
          <p role="alert" className="text-sm text-destructive">
            {submitError}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Apply adjustment"}
        </Button>
      </div>
    </form>
  );
}

export function InventoryManager() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ q: "", lowStock: false, page: 1 });
  const [adjusting, setAdjusting] = useState<AdminProductListItem | null>(null);
  const [log, setLog] = useState<{ productId?: string; productName?: string; page: number }>({
    page: 1,
  });

  const products = useQuery({
    queryKey: ["admin-products", "inventory", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.lowStock) params.set("lowStock", "true");
      if (filters.page > 1) params.set("page", String(filters.page));
      const query = params.toString();
      return apiFetch<AdminProductListResult>(`/api/admin/products${query ? `?${query}` : ""}`);
    },
    placeholderData: (previous) => previous,
  });

  const adjustments = useQuery({
    queryKey: ["admin-adjustments", log.productId ?? null, log.page],
    queryFn: () => {
      const params = new URLSearchParams();
      if (log.productId) params.set("productId", log.productId);
      if (log.page > 1) params.set("page", String(log.page));
      const query = params.toString();
      return apiFetch<AdjustmentListResult>(
        `/api/admin/inventory/adjustments${query ? `?${query}` : ""}`,
      );
    },
    placeholderData: (previous) => previous,
  });

  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="inventory-stock-heading" className="flex flex-col gap-4">
        <h2 id="inventory-stock-heading" className="text-base font-semibold">
          Stock levels
        </h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            setFilters((current) => ({ ...current, q: search.trim(), page: 1 }));
          }}
          className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
        >
          <div className="flex min-w-40 flex-1 flex-col gap-1">
            <Label htmlFor="inventory-q">Search</Label>
            <Input
              id="inventory-q"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or slug…"
            />
          </div>
          <label className="flex h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.lowStock}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  lowStock: event.target.checked,
                  page: 1,
                }))
              }
              className="accent-primary"
            />
            Low stock only
          </label>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        {products.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only" role="status">
              Loading stock levels…
            </span>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : products.isError ? (
          <div role="alert" className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Stock levels could not be loaded. {products.error.message}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => products.refetch()}>
              Try again
            </Button>
          </div>
        ) : products.data.items.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No products match these filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableCaption className="sr-only">
                  Stock levels — {products.data.total} products
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Product</TableHead>
                    <TableHead scope="col" className="text-right">
                      Stock
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Threshold
                    </TableHead>
                    <TableHead scope="col">Status</TableHead>
                    <TableHead scope="col">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.data.items.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">/{product.slug}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.stockQuantity}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {product.lowStockThreshold}
                      </TableCell>
                      <TableCell>
                        {product.stockQuantity === 0 ? (
                          <Badge variant="destructive">Out of stock</Badge>
                        ) : product.stockQuantity <= product.lowStockThreshold ? (
                          <Badge variant="secondary">Low stock</Badge>
                        ) : (
                          <Badge variant="outline">In stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-label={`Adjust stock for ${product.name}`}
                            onClick={() => setAdjusting(product)}
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-label={`Show history for ${product.name}`}
                            onClick={() =>
                              setLog({ productId: product.id, productName: product.name, page: 1 })
                            }
                          >
                            History
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <nav aria-label="Stock pages" className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground" aria-live="polite">
                Page {products.data.page} of {products.data.totalPages} — {products.data.total}{" "}
                products
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={products.data.page <= 1}
                  onClick={() =>
                    setFilters((current) => ({ ...current, page: products.data.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={products.data.page >= products.data.totalPages}
                  onClick={() =>
                    setFilters((current) => ({ ...current, page: products.data.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </nav>
          </>
        )}
      </section>

      <section aria-labelledby="inventory-log-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="inventory-log-heading" className="text-base font-semibold">
            Adjustment history
          </h2>
          {log.productId && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Showing history for {log.productName}
              <Button variant="outline" size="sm" onClick={() => setLog({ page: 1 })}>
                Show all
              </Button>
            </p>
          )}
        </div>

        {adjustments.isPending ? (
          <div aria-busy="true" className="flex flex-col gap-2">
            <span className="sr-only" role="status">
              Loading adjustment history…
            </span>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : adjustments.isError ? (
          <div role="alert" className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              The history could not be loaded. {adjustments.error.message}
            </p>
            <Button className="mt-4" variant="outline" onClick={() => adjustments.refetch()}>
              Try again
            </Button>
          </div>
        ) : adjustments.data.items.length === 0 ? (
          <div className="rounded-xl border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">No adjustments recorded yet.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border bg-card">
              <Table>
                <TableCaption className="sr-only">
                  Inventory adjustments — {adjustments.data.total} total
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Date</TableHead>
                    <TableHead scope="col">Product</TableHead>
                    <TableHead scope="col" className="text-right">
                      Change
                    </TableHead>
                    <TableHead scope="col">Reason</TableHead>
                    <TableHead scope="col">By</TableHead>
                    <TableHead scope="col">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.data.items.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(new Date(entry.createdAt))}
                      </TableCell>
                      <TableCell className="font-medium">{entry.product.name}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                      </TableCell>
                      <TableCell>{REASON_LABELS[entry.reason] ?? entry.reason}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {entry.actor?.name ??
                          (entry.order ? `System — ${entry.order.orderNumber}` : "System")}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {entry.note ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <nav aria-label="History pages" className="flex items-center justify-between text-sm">
              <p className="text-muted-foreground" aria-live="polite">
                Page {adjustments.data.page} of {adjustments.data.totalPages} —{" "}
                {adjustments.data.total} adjustments
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={adjustments.data.page <= 1}
                  onClick={() =>
                    setLog((current) => ({ ...current, page: adjustments.data.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={adjustments.data.page >= adjustments.data.totalPages}
                  onClick={() =>
                    setLog((current) => ({ ...current, page: adjustments.data.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </nav>
          </>
        )}
      </section>

      <Dialog open={adjusting !== null} onOpenChange={(open) => !open && setAdjusting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjusting ? `Adjust stock for ${adjusting.name}` : ""}</DialogTitle>
            <DialogDescription>
              Every change is recorded in the audit log with your name.
            </DialogDescription>
          </DialogHeader>
          {adjusting && <AdjustDialogForm product={adjusting} onDone={() => setAdjusting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
