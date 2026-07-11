import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StockBadge } from "@/features/catalog/components/stock-badge";

describe("StockBadge", () => {
  it("conveys stock state as text, not color alone", () => {
    render(<StockBadge product={{ stockQuantity: 20, lowStockThreshold: 5 }} />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it("shows low stock at the threshold", () => {
    render(<StockBadge product={{ stockQuantity: 5, lowStockThreshold: 5 }} />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("shows out of stock at zero", () => {
    render(<StockBadge product={{ stockQuantity: 0, lowStockThreshold: 5 }} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });
});
