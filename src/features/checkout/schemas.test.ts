import { describe, expect, it } from "vitest";

import {
  checkoutFormSchema,
  checkoutSchema,
  shippingAddressSchema,
} from "@/features/checkout/schemas";

const ADDRESS = {
  name: "Ada Lovelace",
  street: "1 Analytical Row",
  city: "Dublin",
  postalCode: "D01 F5P2",
  country: "Ireland",
};

const ITEMS = [{ productId: "p1", quantity: 2 }];

describe("shippingAddressSchema", () => {
  it("accepts a complete address and normalizes a blank phone to undefined", () => {
    const parsed = shippingAddressSchema.parse({ ...ADDRESS, phone: "  " });
    expect(parsed.phone).toBeUndefined();
    expect(parsed.name).toBe("Ada Lovelace");
  });

  it("keeps a real phone number, trimmed", () => {
    const parsed = shippingAddressSchema.parse({ ...ADDRESS, phone: " +353 1 234 5678 " });
    expect(parsed.phone).toBe("+353 1 234 5678");
  });

  it("rejects whitespace-only required fields", () => {
    const result = shippingAddressSchema.safeParse({ ...ADDRESS, city: "   " });
    expect(result.success).toBe(false);
  });
});

describe("checkoutFormSchema", () => {
  it("accepts cash on delivery without a demo scenario", () => {
    const result = checkoutFormSchema.safeParse({
      shippingAddress: ADDRESS,
      paymentMethod: "CASH_ON_DELIVERY",
    });
    expect(result.success).toBe(true);
  });

  it("requires a demo scenario for the simulated card", () => {
    const result = checkoutFormSchema.safeParse({
      shippingAddress: ADDRESS,
      paymentMethod: "SIMULATED_CARD",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["simulatedOutcome"]);
  });

  it("accepts the simulated card with an explicit scenario", () => {
    const result = checkoutFormSchema.safeParse({
      shippingAddress: ADDRESS,
      paymentMethod: "SIMULATED_CARD",
      simulatedOutcome: "DECLINE",
    });
    expect(result.success).toBe(true);
  });
});

describe("checkoutSchema", () => {
  const base = { items: ITEMS, shippingAddress: ADDRESS, paymentMethod: "CASH_ON_DELIVERY" };

  it("accepts a complete checkout payload", () => {
    expect(checkoutSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty cart", () => {
    expect(checkoutSchema.safeParse({ ...base, items: [] }).success).toBe(false);
  });

  it("rejects out-of-range quantities", () => {
    expect(
      checkoutSchema.safeParse({ ...base, items: [{ productId: "p1", quantity: 0 }] }).success,
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ ...base, items: [{ productId: "p1", quantity: 100 }] }).success,
    ).toBe(false);
  });

  it("enforces the demo-scenario rule on the wire too", () => {
    const result = checkoutSchema.safeParse({ ...base, paymentMethod: "SIMULATED_CARD" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["simulatedOutcome"]);
  });
});
