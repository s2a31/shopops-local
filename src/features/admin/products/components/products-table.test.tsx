import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProductsTable } from "@/features/admin/products/components/products-table";

function renderTable() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProductsTable categories={[{ slug: "home", name: "Home" }]} />
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
      id: "p1",
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      priceCents: 7990,
      stockQuantity: 2,
      lowStockThreshold: 5,
      isActive: false,
      updatedAt: "2026-07-10T10:00:00.000Z",
      category: { id: "c1", name: "Home", slug: "home" },
      images: [{ url: "/images/products/halo-desk-lamp.svg", altText: "A lamp" }],
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

describe("ProductsTable", () => {
  it("renders products with low-stock and inactive status text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(listResult)));
    renderTable();

    expect(await screen.findByText("Halo Desk Lamp")).toBeInTheDocument();
    expect(screen.getByText("€79.90")).toBeInTheDocument();
    expect(screen.getByText("2 left")).toBeInTheDocument();
    // "Inactive" also exists as a filter option — assert the badge inside the table.
    expect(within(screen.getByRole("table")).getByText("Inactive")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Halo Desk Lamp" })).toHaveAttribute(
      "href",
      "/admin/products/p1/edit",
    );
    expect(screen.getByText("Page 1 of 1 — 1 products")).toBeInTheDocument();
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

    expect(await screen.findByText("No products match these filters.")).toBeInTheDocument();
  });

  it("shows an error state with a retry control", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: { code: "INTERNAL", message: "Something went wrong. Please try again." } },
            500,
          ),
        ),
    );
    renderTable();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
