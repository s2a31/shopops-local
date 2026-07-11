import { describe, expect, it } from "vitest";

import { stockState } from "@/features/catalog/stock";

describe("stockState", () => {
  it("is out-of-stock at zero", () => {
    expect(stockState({ stockQuantity: 0, lowStockThreshold: 5 })).toBe("out-of-stock");
  });

  it("is low-stock at or below the threshold", () => {
    expect(stockState({ stockQuantity: 1, lowStockThreshold: 5 })).toBe("low-stock");
    expect(stockState({ stockQuantity: 5, lowStockThreshold: 5 })).toBe("low-stock");
  });

  it("is in-stock above the threshold", () => {
    expect(stockState({ stockQuantity: 6, lowStockThreshold: 5 })).toBe("in-stock");
  });
});
