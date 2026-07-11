import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardSummaryCards } from "@/features/admin/dashboard/components/dashboard-summary";

import type { DashboardSummary } from "@/server/services/admin.service";

const emptySummary: DashboardSummary = {
  revenue30dCents: 0,
  ordersByStatus: { PLACED: 0, PROCESSING: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 },
  lowStock: [],
  topProducts: [],
};

const populatedSummary: DashboardSummary = {
  revenue30dCents: 123456,
  ordersByStatus: { PLACED: 3, PROCESSING: 1, SHIPPED: 0, DELIVERED: 7, CANCELLED: 2 },
  lowStock: [
    {
      id: "p1",
      name: "Halo Desk Lamp",
      slug: "halo-desk-lamp",
      stockQuantity: 2,
      lowStockThreshold: 5,
    },
    {
      id: "p2",
      name: "Compass Mug",
      slug: "compass-mug",
      stockQuantity: 0,
      lowStockThreshold: 5,
    },
  ],
  topProducts: [{ productId: "p1", name: "Halo Desk Lamp", unitsSold: 9, revenueCents: 71910 }],
};

describe("DashboardSummaryCards", () => {
  it("renders labelled sections with designed empty states", () => {
    render(<DashboardSummaryCards summary={emptySummary} />);

    expect(screen.getByRole("heading", { name: "Revenue — last 30 days" })).toBeInTheDocument();
    expect(screen.getByText("€0.00")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Orders by status" })).toBeInTheDocument();
    expect(
      screen.getByText("Every active product is above its low-stock threshold."),
    ).toBeInTheDocument();
    expect(screen.getByText("No sales yet.")).toBeInTheDocument();
  });

  it("formats revenue as euros and counts every order status", () => {
    render(<DashboardSummaryCards summary={populatedSummary} />);

    expect(screen.getByText("€1,234.56")).toBeInTheDocument();
    const orders = screen.getByRole("heading", { name: "Orders by status" }).closest("section")!;
    expect(within(orders).getByText("13")).toBeInTheDocument(); // total
    expect(within(orders).getByText("Cancelled")).toBeInTheDocument();
  });

  it("links low-stock products and never conveys stock state by color alone", () => {
    render(<DashboardSummaryCards summary={populatedSummary} />);

    expect(screen.getByRole("link", { name: "Halo Desk Lamp" })).toHaveAttribute(
      "href",
      "/products/halo-desk-lamp",
    );
    expect(screen.getByText("2 left")).toBeInTheDocument();
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("lists top products with units sold and revenue", () => {
    render(<DashboardSummaryCards summary={populatedSummary} />);

    const top = screen.getByRole("heading", { name: "Top products" }).closest("section")!;
    expect(within(top).getByText("Halo Desk Lamp")).toBeInTheDocument();
    expect(within(top).getByText("9 sold · €719.10")).toBeInTheDocument();
  });
});
