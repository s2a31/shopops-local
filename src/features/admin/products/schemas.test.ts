import { describe, expect, it } from "vitest";

import {
  adminProductFiltersSchema,
  adminProductFormSchema,
} from "@/features/admin/products/schemas";

const validForm = {
  name: "Halo Desk Lamp",
  slug: "",
  description: "A lamp.",
  price: "79.90",
  categoryId: "c1",
  images: [],
  isActive: true,
  lowStockThreshold: "5",
  initialStock: "10",
};

describe("adminProductFormSchema", () => {
  it("converts a euro price with dot or comma decimals to integer cents", () => {
    expect(adminProductFormSchema.parse(validForm).price).toBe(7990);
    expect(adminProductFormSchema.parse({ ...validForm, price: "79,90" }).price).toBe(7990);
    expect(adminProductFormSchema.parse({ ...validForm, price: "12" }).price).toBe(1200);
  });

  it("rejects prices with more than two decimals, zero, or garbage", () => {
    expect(adminProductFormSchema.safeParse({ ...validForm, price: "79.999" }).success).toBe(false);
    expect(adminProductFormSchema.safeParse({ ...validForm, price: "0" }).success).toBe(false);
    expect(adminProductFormSchema.safeParse({ ...validForm, price: "abc" }).success).toBe(false);
    expect(adminProductFormSchema.safeParse({ ...validForm, price: "" }).success).toBe(false);
  });

  it("treats an empty slug as not provided", () => {
    expect(adminProductFormSchema.parse(validForm).slug).toBeUndefined();
    expect(adminProductFormSchema.parse({ ...validForm, slug: "my-slug" }).slug).toBe("my-slug");
  });

  it("coerces the numeric text inputs to integers", () => {
    const parsed = adminProductFormSchema.parse(validForm);
    expect(parsed.lowStockThreshold).toBe(5);
    expect(parsed.initialStock).toBe(10);
  });
});

describe("adminProductFiltersSchema", () => {
  it("falls back to safe defaults on garbage input", () => {
    const parsed = adminProductFiltersSchema.parse({
      status: "banana",
      page: "-3",
      lowStock: "nope",
    });
    expect(parsed).toMatchObject({ status: "all", page: 1, lowStock: false });
  });

  it("parses the supported filters", () => {
    const parsed = adminProductFiltersSchema.parse({
      q: "lamp",
      status: "inactive",
      category: "lighting",
      lowStock: "true",
      page: "2",
    });
    expect(parsed).toEqual({
      q: "lamp",
      status: "inactive",
      category: "lighting",
      lowStock: true,
      page: 2,
    });
  });
});
