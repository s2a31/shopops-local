// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { MAX_DISTINCT_LINES, MAX_LINE_QUANTITY } from "@/features/cart/constants";
import { sanitizeCartLines, selectCartCount, useCartStore } from "@/features/cart/store";

beforeEach(() => {
  localStorage.clear();
  useCartStore.setState({ items: [] });
});

describe("cart store", () => {
  it("adds a new line and merges repeat adds of the same product", () => {
    expect(useCartStore.getState().addItem("p1", 2)).toBe("added");
    expect(useCartStore.getState().addItem("p1", 3)).toBe("updated");
    expect(useCartStore.getState().items).toEqual([{ productId: "p1", quantity: 5 }]);
  });

  it("clamps quantities to the line maximum", () => {
    useCartStore.getState().addItem("p1", 250);
    expect(useCartStore.getState().items[0]?.quantity).toBe(MAX_LINE_QUANTITY);

    useCartStore.getState().setQuantity("p1", 500);
    expect(useCartStore.getState().items[0]?.quantity).toBe(MAX_LINE_QUANTITY);

    useCartStore.getState().setQuantity("p1", 0);
    expect(useCartStore.getState().items[0]?.quantity).toBe(1);
  });

  it("rejects new lines beyond the distinct-line limit", () => {
    for (let i = 0; i < MAX_DISTINCT_LINES; i++) {
      expect(useCartStore.getState().addItem(`p${i}`)).toBe("added");
    }
    expect(useCartStore.getState().addItem("one-too-many")).toBe("cart-full");
    // Existing lines can still be updated when the cart is full.
    expect(useCartStore.getState().addItem("p0")).toBe("updated");
    expect(useCartStore.getState().items).toHaveLength(MAX_DISTINCT_LINES);
  });

  it("removes lines and clears the cart", () => {
    useCartStore.getState().addItem("p1");
    useCartStore.getState().addItem("p2");
    useCartStore.getState().removeItem("p1");
    expect(useCartStore.getState().items).toEqual([{ productId: "p2", quantity: 1 }]);
    useCartStore.getState().clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("counts total units across lines", () => {
    useCartStore.getState().addItem("p1", 2);
    useCartStore.getState().addItem("p2", 3);
    expect(selectCartCount(useCartStore.getState())).toBe(5);
  });

  it("persists items to localStorage", () => {
    useCartStore.getState().addItem("p1", 2);
    const raw = localStorage.getItem("shopops-cart");
    expect(raw).toContain('"p1"');
  });
});

describe("sanitizeCartLines (untrusted localStorage)", () => {
  it("drops malformed entries entirely", () => {
    expect(
      sanitizeCartLines([
        null,
        42,
        "junk",
        { productId: 7, quantity: 2 },
        { productId: "", quantity: 2 },
        { productId: "ok", quantity: "2" },
        { productId: "ok", quantity: -1 },
        { productId: "ok", quantity: Number.NaN },
      ]),
    ).toEqual([]);
    expect(sanitizeCartLines("not-an-array")).toEqual([]);
    expect(sanitizeCartLines(undefined)).toEqual([]);
  });

  it("merges duplicates, truncates fractions, and clamps to limits", () => {
    const lines = sanitizeCartLines([
      { productId: "p1", quantity: 2.9 },
      { productId: "p1", quantity: 200 },
    ]);
    expect(lines).toEqual([{ productId: "p1", quantity: MAX_LINE_QUANTITY }]);
  });

  it("enforces the distinct-line cap", () => {
    const raw = Array.from({ length: 80 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
    expect(sanitizeCartLines(raw)).toHaveLength(MAX_DISTINCT_LINES);
  });
});
