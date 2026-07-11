import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InventoryManager } from "@/features/admin/inventory/components/inventory-manager";

function renderManager() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InventoryManager />
    </QueryClientProvider>,
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const productsPage = {
  items: [
    {
      id: "p1",
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      priceCents: 7990,
      stockQuantity: 2,
      lowStockThreshold: 5,
      isActive: true,
      updatedAt: "2026-07-10T10:00:00.000Z",
      category: { id: "c1", name: "Home", slug: "home" },
      images: [],
    },
  ],
  total: 1,
  page: 1,
  pageSize: 12,
  totalPages: 1,
};

const adjustmentsPage = {
  items: [
    {
      id: "a1",
      delta: -3,
      reason: "ORDER_PLACED",
      note: null,
      createdAt: "2026-07-10T10:00:00.000Z",
      product: { id: "p1", name: "Halo Desk Lamp", slug: "halo-desk-lamp" },
      order: { id: "o1", orderNumber: "SO-001042" },
      actor: null,
    },
    {
      id: "a2",
      delta: 5,
      reason: "RESTOCK",
      note: "supplier drop",
      createdAt: "2026-07-09T10:00:00.000Z",
      product: { id: "p1", name: "Halo Desk Lamp", slug: "halo-desk-lamp" },
      order: null,
      actor: { id: "u1", name: "Demo Admin" },
    },
  ],
  total: 2,
  page: 1,
  pageSize: 15,
  totalPages: 1,
};

function stubEndpoints() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((url: string) => {
      if (String(url).includes("/api/admin/inventory/adjustments")) {
        return Promise.resolve(jsonResponse(adjustmentsPage));
      }
      return Promise.resolve(jsonResponse(productsPage));
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("InventoryManager", () => {
  it("shows stock levels with status text and per-row actions", async () => {
    stubEndpoints();
    renderManager();

    expect(await screen.findByText("Halo Desk Lamp", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Adjust stock for Halo Desk Lamp" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show history for Halo Desk Lamp" }),
    ).toBeInTheDocument();
  });

  it("renders the audit trail with signed deltas, actors and system rows", async () => {
    stubEndpoints();
    renderManager();

    const log = (await screen.findByText("Adjustment history")).closest("section")!;
    expect(await within(log).findByText("-3")).toBeInTheDocument();
    expect(within(log).getByText("+5")).toBeInTheDocument();
    expect(within(log).getByText("Order placed")).toBeInTheDocument();
    expect(within(log).getByText("System — SO-001042")).toBeInTheDocument();
    expect(within(log).getByText("Demo Admin")).toBeInTheDocument();
    expect(within(log).getByText("supplier drop")).toBeInTheDocument();
  });

  it("opens the adjustment dialog with labelled fields and current stock", async () => {
    stubEndpoints();
    const user = userEvent.setup();
    renderManager();

    await user.click(
      await screen.findByRole("button", { name: "Adjust stock for Halo Desk Lamp" }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Adjust stock for Halo Desk Lamp" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByLabelText("Change (use a negative number to remove)"),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Note (optional)")).toBeInTheDocument();
    expect(within(dialog).getByText("2")).toBeInTheDocument(); // current stock
  });
});
