"use client";

import { useState } from "react";
import Link from "next/link";
import { OrderStatus } from "@prisma/client";
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
import { ORDER_STATUS_BADGE_VARIANTS, ORDER_STATUS_LABELS } from "@/features/orders/constants";
import type { AdminOrderListResult } from "@/server/services/admin.service";

const PAYMENT_LABELS: Record<string, string> = {
  CASH_ON_DELIVERY: "Cash on delivery",
  SIMULATED_CARD: "Simulated card",
};

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 outline-none";

interface Filters {
  status: OrderStatus | "";
  q: string;
  page: number;
}

export function OrdersTable() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ status: "", q: "", page: 1 });

  const query = useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.q) params.set("q", filters.q);
      if (filters.page > 1) params.set("page", String(filters.page));
      const qs = params.toString();
      return apiFetch<AdminOrderListResult>(`/api/admin/orders${qs ? `?${qs}` : ""}`);
    },
    placeholderData: (previous) => previous,
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFilters((current) => ({ ...current, q: search.trim(), page: 1 }));
        }}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <Label htmlFor="admin-orders-q">Search</Label>
          <Input
            id="admin-orders-q"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Order number or customer email…"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="admin-orders-status">Status</Label>
          <select
            id="admin-orders-status"
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as Filters["status"],
                page: 1,
              }))
            }
            className={selectClass}
          >
            <option value="">All statuses</option>
            {Object.values(OrderStatus).map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {query.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only" role="status">
            Loading orders…
          </span>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            The order list could not be loaded. {query.error.message}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No orders match these filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableCaption className="sr-only">Orders — {query.data.total} total</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Order</TableHead>
                  <TableHead scope="col">Placed</TableHead>
                  <TableHead scope="col">Customer</TableHead>
                  <TableHead scope="col" className="text-right">
                    Total
                  </TableHead>
                  <TableHead scope="col">Payment</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(new Date(order.createdAt))}
                    </TableCell>
                    <TableCell>
                      <p>{order.user.name}</p>
                      <p className="text-xs text-muted-foreground">{order.user.email}</p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(order.totalCents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {PAYMENT_LABELS[order.paymentMethod]} · {order.paymentStatus.toLowerCase()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ORDER_STATUS_BADGE_VARIANTS[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          aria-label={`View order ${order.orderNumber}`}
                        >
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav aria-label="Order pages" className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground" aria-live="polite">
              Page {query.data.page} of {query.data.totalPages} — {query.data.total} orders
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.page <= 1}
                onClick={() => setFilters((current) => ({ ...current, page: query.data.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.data.page >= query.data.totalPages}
                onClick={() => setFilters((current) => ({ ...current, page: query.data.page + 1 }))}
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
