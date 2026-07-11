import { describe, expect, it } from "vitest";

import {
  calculateLineTotalCents,
  calculateShippingCents,
  formatMoney,
  FREE_SHIPPING_THRESHOLD_CENTS,
  SHIPPING_FEE_CENTS,
} from "@/lib/money";

describe("formatMoney", () => {
  it("formats cents as euros", () => {
    expect(formatMoney(129900)).toBe("€1,299.00");
    expect(formatMoney(0)).toBe("€0.00");
    expect(formatMoney(5)).toBe("€0.05");
  });

  it("rejects non-integer amounts", () => {
    expect(() => formatMoney(10.5)).toThrow();
    expect(() => formatMoney(Number.NaN)).toThrow();
  });
});

describe("calculateShippingCents", () => {
  it("charges the flat fee below the threshold", () => {
    expect(calculateShippingCents(FREE_SHIPPING_THRESHOLD_CENTS - 1)).toBe(SHIPPING_FEE_CENTS);
    expect(calculateShippingCents(0)).toBe(SHIPPING_FEE_CENTS);
  });

  it("is free at and above the threshold", () => {
    expect(calculateShippingCents(FREE_SHIPPING_THRESHOLD_CENTS)).toBe(0);
    expect(calculateShippingCents(FREE_SHIPPING_THRESHOLD_CENTS + 1)).toBe(0);
  });
});

describe("calculateLineTotalCents", () => {
  it("multiplies unit price by quantity", () => {
    expect(calculateLineTotalCents(2890, 3)).toBe(8670);
  });

  it("rejects zero, negative, and fractional quantities", () => {
    expect(() => calculateLineTotalCents(2890, 0)).toThrow();
    expect(() => calculateLineTotalCents(2890, -1)).toThrow();
    expect(() => calculateLineTotalCents(2890, 1.5)).toThrow();
  });
});
