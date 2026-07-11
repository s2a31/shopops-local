import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FilterToolbar } from "@/features/catalog/components/filter-toolbar";
import { parseProductFilters } from "@/features/catalog/schemas";

const categories = [
  { slug: "audio", name: "Audio" },
  { slug: "lighting", name: "Lighting" },
];

describe("FilterToolbar", () => {
  it("renders labelled controls with current values", () => {
    const filters = parseProductFilters({ q: "lamp", category: "lighting", minPrice: "10" });
    render(<FilterToolbar filters={filters} categories={categories} />);

    expect(screen.getByLabelText("Search")).toHaveValue("lamp");
    expect(screen.getByLabelText("Category")).toHaveValue("lighting");
    expect(screen.getByLabelText("Min price (€)")).toHaveValue(10);
    expect(screen.getByLabelText("Max price (€)")).toHaveValue(null);
    expect(screen.getByLabelText("Sort by")).toHaveValue("newest");
    expect(screen.getByRole("button", { name: "Apply filters" })).toBeInTheDocument();
  });

  it("offers Clear only when filters are active", () => {
    const { rerender } = render(
      <FilterToolbar filters={parseProductFilters({})} categories={categories} />,
    );
    expect(screen.queryByRole("link", { name: "Clear" })).not.toBeInTheDocument();

    rerender(
      <FilterToolbar filters={parseProductFilters({ q: "lamp" })} categories={categories} />,
    );
    expect(screen.getByRole("link", { name: "Clear" })).toHaveAttribute("href", "/products");
  });

  it("submits as a plain GET form to /products (works without JavaScript)", () => {
    render(<FilterToolbar filters={parseProductFilters({})} categories={categories} />);
    const search = screen.getByLabelText("Search");
    const form = search.closest("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/products");
  });
});
