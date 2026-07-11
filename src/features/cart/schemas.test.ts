import { describe, expect, it } from "vitest";

import { cartItemsSchema } from "@/features/cart/schemas";

const line = (overrides: Partial<{ productId: string; quantity: number }> = {}) => ({
  productId: "p1",
  quantity: 1,
  ...overrides,
});

describe("cartItemsSchema", () => {
  it("accepts a valid cart", () => {
    expect(cartItemsSchema.safeParse({ items: [line({ quantity: 99 })] }).success).toBe(true);
  });

  it("rejects empty carts", () => {
    expect(cartItemsSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it("rejects invalid quantities", () => {
    expect(cartItemsSchema.safeParse({ items: [line({ quantity: 0 })] }).success).toBe(false);
    expect(cartItemsSchema.safeParse({ items: [line({ quantity: 100 })] }).success).toBe(false);
    expect(cartItemsSchema.safeParse({ items: [line({ quantity: 1.5 })] }).success).toBe(false);
  });

  it("rejects more than 50 lines", () => {
    const items = Array.from({ length: 51 }, (_, i) => line({ productId: `p${i}` }));
    expect(cartItemsSchema.safeParse({ items }).success).toBe(false);
  });

  it("rejects malformed product ids", () => {
    expect(cartItemsSchema.safeParse({ items: [line({ productId: "" })] }).success).toBe(false);
    expect(
      cartItemsSchema.safeParse({ items: [line({ productId: "x".repeat(65) })] }).success,
    ).toBe(false);
  });
});
