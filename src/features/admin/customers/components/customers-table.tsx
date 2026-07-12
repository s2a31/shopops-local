"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-client";
import { formatDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

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
import type { AdminCustomerListResult } from "@/server/services/admin.service";

export function CustomersTable() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ q: "", page: 1 });

  const query = useQuery({
    queryKey: ["admin-customers", filters],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.page > 1) params.set("page", String(filters.page));
      const qs = params.toString();
      return apiFetch<AdminCustomerListResult>(`/api/admin/customers${qs ? `?${qs}` : ""}`);
    },
    placeholderData: (previous) => previous,
  });

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFilters({ q: search.trim(), page: 1 });
        }}
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <Label htmlFor="admin-customers-q">Search</Label>
          <Input
            id="admin-customers-q"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email…"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {query.isPending ? (
        <div aria-busy="true" className="flex flex-col gap-2">
          <span className="sr-only" role="status">
            Loading customers…
          </span>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : query.isError ? (
        <div role="alert" className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            The customer list could not be loaded. {query.error.message}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      ) : query.data.items.length === 0 ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No customers match this search.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableCaption className="sr-only">Customers — {query.data.total} total</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Name</TableHead>
                  <TableHead scope="col">Email</TableHead>
                  <TableHead scope="col">Joined</TableHead>
                  <TableHead scope="col" className="text-right">
                    Orders
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Total spent
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.data.items.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(new Date(customer.createdAt))}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{customer.orderCount}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(customer.totalSpentCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <nav aria-label="Customer pages" className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground" aria-live="polite">
              Page {query.data.page} of {query.data.totalPages} — {query.data.total} customers
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
