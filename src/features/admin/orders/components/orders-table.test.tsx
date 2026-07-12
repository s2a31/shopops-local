import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OrdersTable } from "@/features/admin/orders/components/orders-table";

function renderTable() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OrdersTable />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const listResult = {
  items: [
    {
      id: "o1",
      orderNumber: "SO-100001",
      status: "PLACED",
      paymentMethod: "CASH_ON_DELIVERY",
      paymentStatus: "PENDING",
      totalCents: 15980,
      createdAt: "2026-07-10T10:00:00.000Z",
      user: { id: "u1", name: "Demo Customer", email: "customer@shopops.local" },
      _count: { items: 2 },
    },
  ],
  total: 1,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("OrdersTable", () => {
  it("renders orders with customer, payment and status text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(listResult)));
    renderTable();

    expect(await screen.findByText("SO-100001")).toBeInTheDocument();
    expect(screen.getByText("Demo Customer")).toBeInTheDocument();
    expect(screen.getByText("customer@shopops.local")).toBeInTheDocument();
    expect(screen.getByText("€159.80")).toBeInTheDocument();
    expect(screen.getByText("Cash on delivery · pending")).toBeInTheDocument();
    // "Placed" is also the date column's header, so target the status cell.
    expect(
      within(screen.getByRole("table")).getByRole("cell", { name: "Placed" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View order SO-100001" })).toHaveAttribute(
      "href",
      "/admin/orders/o1",
    );
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

    expect(await screen.findByText("No orders match these filters.")).toBeInTheDocument();
  });
});
