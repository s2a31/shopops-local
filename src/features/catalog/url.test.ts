import { describe, expect, it } from "vitest";

import { parseProductFilters } from "@/features/catalog/schemas";
import { productsHref } from "@/features/catalog/url";

const defaults = parseProductFilters({});

describe("productsHref", () => {
  it("omits defaults entirely", () => {
    expect(productsHref(defaults)).toBe("/products");
  });

  it("includes only non-default values", () => {
    expect(productsHref({ ...defaults, category: "audio", sort: "price-asc" })).toBe(
      "/products?category=audio&sort=price-asc",
    );
  });

  it("applies overrides (pagination keeps existing filters)", () => {
    const href = productsHref({ ...defaults, q: "lamp" }, { page: 2 });
    expect(href).toBe("/products?q=lamp&page=2");
  });

  it("drops page when overridden back to 1", () => {
    expect(productsHref({ ...defaults, page: 5 }, { page: 1 })).toBe("/products");
  });

  it("encodes query values", () => {
    expect(productsHref({ ...defaults, q: "salt & pepper" })).toBe("/products?q=salt+%26+pepper");
  });
});
