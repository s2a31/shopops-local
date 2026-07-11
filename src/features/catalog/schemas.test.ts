import { describe, expect, it } from "vitest";

import { parseProductFilters } from "@/features/catalog/schemas";

describe("parseProductFilters", () => {
  it("returns defaults for an empty query", () => {
    expect(parseProductFilters({})).toEqual({
      q: undefined,
      category: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      sort: "newest",
      page: 1,
    });
  });

  it("parses a full set of valid filters", () => {
    const filters = parseProductFilters({
      q: "lamp",
      category: "lighting",
      minPrice: "10",
      maxPrice: "200",
      sort: "price-asc",
      page: "3",
    });
    expect(filters).toEqual({
      q: "lamp",
      category: "lighting",
      minPrice: 10,
      maxPrice: 200,
      sort: "price-asc",
      page: 3,
    });
  });

  it("treats empty strings as absent (GET forms submit empty fields)", () => {
    const filters = parseProductFilters({ q: "", category: "", minPrice: "", maxPrice: "" });
    expect(filters.q).toBeUndefined();
    expect(filters.category).toBeUndefined();
    expect(filters.minPrice).toBeUndefined();
    expect(filters.maxPrice).toBeUndefined();
  });

  it("falls back to defaults on invalid values instead of throwing", () => {
    const filters = parseProductFilters({
      minPrice: "-5",
      maxPrice: "abc",
      sort: "hacker",
      page: "0",
    });
    expect(filters.minPrice).toBeUndefined();
    expect(filters.maxPrice).toBeUndefined();
    expect(filters.sort).toBe("newest");
    expect(filters.page).toBe(1);
  });

  it("uses the first value when a parameter repeats", () => {
    expect(parseProductFilters({ q: ["kettle", "mug"] }).q).toBe("kettle");
  });
});
