import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomersTable } from "@/features/admin/customers/components/customers-table";

function renderTable() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CustomersTable />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CustomersTable", () => {
  it("renders customers with order counts and lifetime spend", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            {
              id: "u1",
              name: "Demo Customer",
              email: "customer@shopops.local",
              createdAt: "2026-06-01T10:00:00.000Z",
              orderCount: 4,
              totalSpentCents: 45620,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 12,
          totalPages: 1,
        }),
      ),
    );
    renderTable();

    expect(await screen.findByText("Demo Customer")).toBeInTheDocument();
    expect(screen.getByText("customer@shopops.local")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("€456.20")).toBeInTheDocument();
  });

  it("shows a designed empty state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ items: [], total: 0, page: 1, pageSize: 12, totalPages: 1 }),
        ),
    );
    renderTable();

    expect(await screen.findByText("No customers match this search.")).toBeInTheDocument();
  });
});
