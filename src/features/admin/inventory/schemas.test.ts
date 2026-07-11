import { describe, expect, it } from "vitest";

import {
  adminAdjustmentCreateSchema,
  adminAdjustmentFiltersSchema,
  adminAdjustmentFormSchema,
} from "@/features/admin/inventory/schemas";

describe("adminAdjustmentCreateSchema", () => {
  it("accepts a negative delta with a manual reason", () => {
    const parsed = adminAdjustmentCreateSchema.parse({
      productId: "p1",
      delta: -3,
      reason: "MANUAL_CORRECTION",
      note: "  damaged in storage  ",
    });
    expect(parsed).toEqual({
      productId: "p1",
      delta: -3,
      reason: "MANUAL_CORRECTION",
      note: "damaged in storage",
    });
  });

  it("rejects a zero delta and system-only reasons", () => {
    expect(
      adminAdjustmentCreateSchema.safeParse({ productId: "p1", delta: 0, reason: "RESTOCK" })
        .success,
    ).toBe(false);
    expect(
      adminAdjustmentCreateSchema.safeParse({ productId: "p1", delta: 5, reason: "ORDER_PLACED" })
        .success,
    ).toBe(false);
  });

  it("treats an empty note as not provided", () => {
    const parsed = adminAdjustmentCreateSchema.parse({
      productId: "p1",
      delta: 5,
      reason: "RESTOCK",
      note: "",
    });
    expect(parsed.note).toBeUndefined();
  });
});

describe("adminAdjustmentFormSchema", () => {
  it("coerces the delta text input and rejects fractions", () => {
    expect(
      adminAdjustmentFormSchema.parse({ delta: "-4", reason: "RESTOCK", note: "" }).delta,
    ).toBe(-4);
    expect(
      adminAdjustmentFormSchema.safeParse({ delta: "1.5", reason: "RESTOCK", note: "" }).success,
    ).toBe(false);
    expect(
      adminAdjustmentFormSchema.safeParse({ delta: "", reason: "RESTOCK", note: "" }).success,
    ).toBe(false);
  });
});

describe("adminAdjustmentFiltersSchema", () => {
  it("falls back to safe defaults on garbage input", () => {
    expect(adminAdjustmentFiltersSchema.parse({ page: "zero" })).toEqual({
      productId: undefined,
      page: 1,
    });
    expect(adminAdjustmentFiltersSchema.parse({ productId: "p1", page: "3" })).toEqual({
      productId: "p1",
      page: 3,
    });
  });
});
